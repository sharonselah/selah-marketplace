'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CalendarPlus, Inbox, Send } from 'lucide-react';
import { BookingList } from '@/components/shared/BookingList';
import { Button, LinkButton } from '@/components/ui/Button';
import { Avatar, Card, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ProcessingSteps, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { PROPOSAL_TONE } from '@/lib/constants/labels';
import { formatDate, timeAgo } from '@/lib/format';
import { byId, findArtist, samePartyRef } from '@/lib/selectors';
import { markPitchViewed, respondToPitch } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';
import type { ArtistPitch, BusinessAccount, EventId, World } from '@/types';

type Tab = 'requests' | 'proposals' | 'past';

export default function BizBookingsPage() {
  const { world, actingAs, business } = useViewer();
  const b = business!;
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'proposals' ? 'proposals' : 'requests');
  const [accepting, setAccepting] = useState<ArtistPitch | null>(null);
  const requests = world.bookingRequests.filter((r) => samePartyRef(r.buyer, actingAs)).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const isPast = (r: (typeof requests)[number]) => {
    const bk = byId(world.bookings, r.bookingId);
    return ['DECLINED', 'EXPIRED', 'CANCELLED'].includes(r.status) || bk?.status === 'PAID' || bk?.status === 'CANCELLED';
  };
  const pitches = world.pitches.filter((p) => p.to === b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const openPitches = pitches.filter((p) => p.status === 'SENT' || p.status === 'VIEWED');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bookings" subtitle="Requests you’ve sent, and proposals artists have pitched you." action={<LinkButton href="/biz/artists" icon={<CalendarPlus className="size-4" />}>Book an artist</LinkButton>} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'requests', label: 'Active', count: requests.filter((r) => !isPast(r)).length },
          { value: 'proposals', label: 'Proposals received', count: openPitches.length },
          { value: 'past', label: 'Past', count: requests.filter(isPast).length },
        ]}
      />
      {tab === 'proposals' ? (
        pitches.length === 0 ? (
          <EmptyState icon={<Inbox className="size-8" />} title="No proposals yet" body="Artists can pitch your venue from their studio. Their proposals land here." />
        ) : (
          <Card padded={false}>
            <div className="flex flex-col gap-1">
              {pitches.map((p) => {
                const a = findArtist(world, p.artistId);
                const open = p.status === 'SENT' || p.status === 'VIEWED';
                return (
                  <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <Avatar name={a?.stageName ?? 'Artist'} verified={a?.verification === 'VERIFIED_ARTIST'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-text">
                        {a?.stageName} <StatusPill status={p.status} tones={PROPOSAL_TONE} />
                      </div>
                      <p className="text-sm text-muted">“{p.message}”</p>
                      <div className="text-xs text-muted">{p.eventId ? `For ${byId(world.events, p.eventId)?.title} · ` : ''}{timeAgo(p.createdAt)} · <Link href={`/artists/${p.artistId}`} className="text-brand hover:underline">View profile</Link></div>
                    </div>
                    <Money amount={p.fee} className="text-sm font-semibold text-text" />
                    {open && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { markPitchViewed(p.id); setAccepting(p); }}>Accept</Button>
                        <Button size="sm" variant="ghost" onClick={() => { respondToPitch(p.id, false); toast('Proposal declined', 'info'); }}>Decline</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )
      ) : (
        (() => {
          const list = requests.filter((r) => (tab === 'past' ? isPast(r) : !isPast(r)));
          return list.length === 0 ? (
            <EmptyState icon={<Send className="size-8" />} title={tab === 'past' ? 'No past bookings' : 'No active bookings'} body="Find an artist in the directory and send a request. You only pay once they accept and you both sign." action={<LinkButton href="/biz/artists">Browse artists</LinkButton>} />
          ) : (
            <Card padded={false} className="px-5 py-1">
              <BookingList world={world} requests={list} side="BUYER" href={(r) => `/biz/bookings/${r.id}`} />
            </Card>
          );
        })()
      )}
      {accepting && <AcceptPitchModal pitch={accepting} world={world} business={b} onClose={() => setAccepting(null)} />}
    </div>
  );
}

/** Turn an accepted pitch into a booking request: pick the event (or name a date). */
function AcceptPitchModal({ pitch, world, business, onClose }: { pitch: ArtistPitch; world: World; business: BusinessAccount; onClose: () => void }) {
  const router = useRouter();
  const upcoming = world.events.filter((e) => e.venueId === business.id && (e.status === 'PUBLISHED' || e.status === 'DRAFT'));
  const [eventId, setEventId] = useState<EventId | 'OTHER'>(pitch.eventId ?? upcoming[0]?.id ?? 'OTHER');
  const [name, setName] = useState(`${findArtist(world, pitch.artistId)?.stageName} at ${business.name}`);
  const [date, setDate] = useState('');
  const [sending, setSending] = useState(false);
  const ev = eventId === 'OTHER' ? undefined : byId(world.events, eventId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open onClose={() => !sending && onClose()} title="Accept proposal">
      {sending ? (
        <ProcessingSteps
          title="Sending booking request"
          done="Request sent"
          steps={['Accepting the proposal', `Booking at the pitched fee`, 'Notifying the artist']}
          stepMs={700}
          onDone={() => {
            const id = respondToPitch(pitch.id, true, { eventName: ev?.title ?? name.trim(), date: ev?.date ?? new Date(`${date}T21:00`).toISOString(), location: business.address });
            toast('Booking request sent. Sign the contract once they confirm.');
            onClose();
            if (id) router.push(`/biz/bookings/${id}`);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">We’ll send a booking request at the pitched fee. The contract and escrow payment follow once the artist confirms.</p>
          <Field label="For which night?">
            <Select<EventId | 'OTHER'> value={eventId} onChange={setEventId} options={[...upcoming.map((e) => ({ value: e.id, label: `${e.title} · ${formatDate(e.date)}` })), { value: 'OTHER', label: 'Another date' }]} />
          </Field>
          {eventId === 'OTHER' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Date"><Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
          )}
          <Button block disabled={eventId === 'OTHER' && (!date || !name.trim())} onClick={() => setSending(true)}>Accept & send request</Button>
        </div>
      )}
    </Modal>
  );
}
