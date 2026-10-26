'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, ExternalLink, Pencil, Plus, Rocket, X } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { EventForm } from '@/components/shared/EventForm';
import { InventoryFormModal } from '@/components/shared/InventoryForm';
import { ReadinessBanner } from '@/components/shared/Business';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, Cover, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { eventPhoto } from '@/lib/data/photos';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { ProgressBar, Timeline } from '@/components/ui/Visuals';
import { EVENT_TONE, TICKET_TIER_LABEL } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { artists, byId, findArtist, readiness, samePartyRef } from '@/lib/selectors';
import { ticketsForEvent } from '@/lib/store/actions/orders';
import { saveEvent, setEventStatus, setLineup } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';
import type { ArtistId, EventId, InventoryItem, Minor } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: EventId }>();
  const { world, business, actingAs } = useViewer();
  const b = business!;
  const [editing, setEditing] = useState(false);
  const [ticket, setTicket] = useState<{ item?: InventoryItem } | null>(null);
  const [addArtist, setAddArtist] = useState<ArtistId | ''>('');
  const e = byId(world.events, id);
  if (!e || e.venueId !== b.id) return <EmptyState title="Event not found" action={<BackLink href="/biz/events" label="Events" />} />;

  const tickets = ticketsForEvent(world, e.id).flatMap((t) => (t.type === 'TICKET' ? [t] : []));
  const orders = world.orders.filter((o) => o.eventId === e.id);
  const revenue = orders.filter((o) => o.status !== 'REFUNDED').reduce((a, o) => a + o.total, 0) as Minor;
  const sold = tickets.reduce((a, t) => a + t.sold, 0);
  const capacity = tickets.reduce((a, t) => a + t.capacity, 0);
  const { ready, missing } = readiness(b);
  const publishBlock = !tickets.length ? 'Add at least one ticket tier first.' : !ready ? `Finish setup first: ${missing.join(', ')}.` : null;
  // Booked artists first, then the rest of the directory.
  const booked = new Set(world.bookings.filter((x) => samePartyRef(x.buyer, actingAs) && x.status !== 'CANCELLED').map((x) => x.artistId));
  const lineupOptions = artists(world)
    .filter((a) => a.capabilities.includes('SELL_ARTIST_SERVICES') && !e.lineup.includes(a.id))
    .sort((a, c) => Number(booked.has(c.id)) - Number(booked.has(a.id)))
    .map((a) => ({ value: a.id, label: `${a.stageName}${booked.has(a.id) ? ' (booked)' : ''}` }));
  const terminal = e.status === 'COMPLETED' || e.status === 'CANCELLED';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader back={<BackLink href="/biz/events" label="Events" />} title={e.title} subtitle={formatDateTime(e.date)} action={<StatusPill status={e.status} tones={EVENT_TONE} />} />
      {e.status === 'DRAFT' && <ReadinessBanner business={b} />}

      <Card>
        <Timeline steps={['DRAFT', 'PUBLISHED', 'COMPLETED'] as const} current={e.status === 'SOLD_OUT' ? 'PUBLISHED' : e.status === 'CANCELLED' ? 'DRAFT' : e.status} failed={e.status === 'CANCELLED' ? 'CANCELLED' : undefined} />
        <div className="mt-5 flex flex-wrap gap-2">
          {e.status === 'DRAFT' && (
            <>
              <Button icon={<Rocket className="size-4" />} onClick={() => { if (publishBlock) return toast(publishBlock, 'bad'); setEventStatus(e.id, 'PUBLISHED'); toast('Published. It’s live in Discover.'); }}>
                Publish
              </Button>
              {publishBlock && <span className="self-center text-sm text-muted">{publishBlock}</span>}
            </>
          )}
          {e.status === 'PUBLISHED' && <Button variant="outline" onClick={() => setEventStatus(e.id, 'SOLD_OUT')}>Mark sold out</Button>}
          {e.status === 'SOLD_OUT' && <Button variant="outline" onClick={() => setEventStatus(e.id, 'PUBLISHED')}>Reopen sales</Button>}
          {(e.status === 'PUBLISHED' || e.status === 'SOLD_OUT') && (
            <>
              <Button variant="secondary" icon={<CheckCircle2 className="size-4" />} onClick={() => { setEventStatus(e.id, 'COMPLETED'); toast('Event completed'); }}>Mark completed</Button>
              <Link href={`/events/${e.id}`} className="inline-flex items-center gap-1 self-center px-2 text-sm text-brand hover:underline">Public page <ExternalLink className="size-3.5" /></Link>
            </>
          )}
          {!terminal && (
            <Button
              variant="ghost"
              className="text-bad"
              onClick={() => {
                const paid = orders.filter((o) => o.status === 'PAID').length;
                if (!confirm(paid ? `Cancel ${e.title}? ${paid} paid order(s) will be refunded in full.` : `Cancel ${e.title}?`)) return;
                setEventStatus(e.id, 'CANCELLED');
                toast(paid ? `Cancelled. ${paid} order(s) refunded.` : 'Event cancelled', 'info');
              }}
            >
              Cancel event
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Tickets" subtitle={capacity ? `${sold} of ${capacity} sold` : 'Add early bird, regular and VIP tiers.'} action={!terminal && <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setTicket({})}>Add tier</Button>} />
            {capacity > 0 && <ProgressBar value={sold} max={capacity} className="mb-3" />}
            {tickets.length === 0 ? (
              <p className="text-sm text-muted">No ticket tiers yet. Events need at least one to publish.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text">{TICKET_TIER_LABEL[t.tier]}</div>
                      <div className="text-xs text-muted">{t.sold}/{t.capacity} sold</div>
                    </div>
                    <Money amount={t.price} className="text-sm font-semibold text-text" />
                    {!terminal && (
                      <button className="rounded-tile p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Edit ${t.name}`} onClick={() => setTicket({ item: t })}>
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Lineup" subtitle="Shown on the event page." />
            <div className="flex flex-col gap-1">
              {e.lineup.map((aid) => {
                const a = findArtist(world, aid);
                return a ? (
                  <div key={aid} className="flex items-center gap-2 rounded-tile p-1.5">
                    <Avatar name={a.stageName} size="sm" />
                    <span className="flex-1 text-sm font-medium text-text">{a.stageName}</span>
                    {!terminal && (
                      <button className="rounded-tile p-1.5 text-muted hover:text-bad" aria-label={`Remove ${a.stageName}`} onClick={() => setLineup(e.id, e.lineup.filter((x) => x !== aid))}>
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ) : null;
              })}
              {e.lineup.length === 0 && <p className="text-sm text-muted">No artists yet. Book one from the artist directory, then add them here.</p>}
            </div>
            {!terminal && (
              <div className="mt-3 flex gap-2">
                <Select value={addArtist} onChange={setAddArtist} placeholder="Add an artist" options={lineupOptions} />
                <Button variant="secondary" disabled={!addArtist} onClick={() => { setLineup(e.id, [...e.lineup, addArtist as ArtistId]); setAddArtist(''); }}>Add</Button>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card padded={false} className="overflow-hidden">
            <Cover cover={e.cover} photo={eventPhoto(e.cover)} className="h-28" />
            <div className="p-4">
              <p className="text-sm text-muted">{e.description}</p>
              {!terminal && <Button className="mt-3" size="sm" variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Edit details</Button>}
            </div>
          </Card>
          <Card>
            <DefinitionList items={[['Orders', orders.length], ['Revenue', <Money key="r" amount={revenue} />], ['Checked in', orders.filter((o) => o.status === 'FULFILLED' || o.status === 'COMPLETED').length]]} />
            <Link href="/biz/check-in" className="mt-3 inline-block text-sm text-brand hover:underline">Orders & check-in →</Link>
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit event">
        <EventForm initial={e} submitLabel="Save changes" onSubmit={(input) => { saveEvent(b.id, input, e.id); setEditing(false); toast('Event updated'); }} />
      </Modal>
      {ticket && <InventoryFormModal open onClose={() => setTicket(null)} venueId={b.id} type="TICKET" item={ticket.item} events={[e]} eventId={e.id} />}
    </div>
  );
}
