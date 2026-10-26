'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { Timeline } from '@/components/ui/Visuals';
import { PROPOSAL_TONE } from '@/lib/constants/labels';
import { formatDate, kes, minPrice, timeAgo } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { sendPitch, withdrawPitch } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessId, EventId } from '@/types';

export default function PitchesPage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState<BusinessId | ''>('');
  const [eventId, setEventId] = useState<EventId | ''>('');
  const [fee, setFee] = useState(String(minPrice(artist.pricing.booking) / 100));
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pitches = world.pitches.filter((p) => p.artistId === artist.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const buyers = world.businesses.filter((b) => b.capabilities.includes('BUY_ARTIST_BOOKINGS') && b.ownerId !== me.id);
  const events = world.events.filter((e) => e.venueId === venueId && (e.status === 'PUBLISHED' || e.status === 'DRAFT'));

  return (
    <div>
      <PageHeader title="Proposals" subtitle="Pitch yourself to venues and organisers. If they accept, you get a booking request at your fee." action={<Button icon={<Send className="size-4" />} onClick={() => setOpen(true)}>New proposal</Button>} />
      {pitches.length === 0 ? (
        <EmptyState icon={<Send className="size-8" />} title="No proposals yet" body="Venues are always looking for fresh talent. Send your first pitch." action={<Button onClick={() => setOpen(true)}>Pitch a venue</Button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {pitches.map((p) => {
            const venue = byId(world.businesses, p.to);
            const ev = byId(world.events, p.eventId);
            const offPath = p.status === 'DECLINED' || p.status === 'WITHDRAWN';
            return (
              <div key={p.id} className="rounded-card bg-surface shadow-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={venue?.name ?? '?'} />
                    <div>
                      <div className="font-medium text-text">{venue?.name}</div>
                      <div className="text-xs text-muted">{ev ? `${ev.title} · ${formatDate(ev.date)}` : 'General proposal'} · sent {timeAgo(p.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money amount={p.fee} className="text-sm font-semibold text-text" />
                    <StatusPill status={p.status} tones={PROPOSAL_TONE} />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted">“{p.message}”</p>
                <div className="mt-4">
                  <Timeline steps={['SENT', 'VIEWED', 'ACCEPTED'] as const} current={offPath ? (p.status === 'DECLINED' ? 'VIEWED' : 'SENT') : (p.status as 'SENT' | 'VIEWED' | 'ACCEPTED')} failed={offPath ? p.status : undefined} />
                </div>
                {(p.status === 'SENT' || p.status === 'VIEWED') && (
                  <Button size="sm" variant="ghost" className="mt-3" onClick={() => withdrawPitch(p.id)}>Withdraw</Button>
                )}
                {p.status === 'ACCEPTED' && <p className="mt-3 text-sm text-good">Accepted! Check Gigs & requests for the booking.</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Pitch a venue"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!venueId || !Number(fee) || message.trim().length < 10) return setError('Choose a venue, set your fee and write a short pitch.');
                sendPitch(artist.id, venueId, kes(Number(fee)), message.trim(), eventId || undefined);
                setOpen(false);
                setVenueId('');
                setEventId('');
                setMessage('');
                setError(null);
                toast('Proposal sent');
              }}
            >
              Send proposal
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Venue or organiser">
            <Select value={venueId} onChange={(v) => { setVenueId(v); setEventId(''); }} options={buyers.map((b) => ({ value: b.id, label: b.name }))} placeholder="Choose…" />
          </Field>
          {venueId && events.length > 0 && (
            <Field label="For a specific event? (optional)">
              <Select value={eventId} onChange={setEventId} options={[{ value: '' as EventId, label: 'No, general proposal' }, ...events.map((e) => ({ value: e.id, label: `${e.title} · ${formatDate(e.date)}` }))]} />
            </Field>
          )}
          <Field label="Your fee (KES)">
            <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Pitch" error={error}>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you’re a great fit for their crowd…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
