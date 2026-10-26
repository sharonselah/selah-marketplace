'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, Lock, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { ArtistLine, BackLink } from '@/components/shared/Cards';
import { ReportButton } from '@/components/shared/ReportModal';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, Cover, EmptyState, Money, Orb } from '@/components/ui/Display';
import { eventPhoto } from '@/lib/data/photos';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { TICKET_TIER_LABEL } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { priceCart } from '@/lib/store/actions/orders';
import { useViewer } from '@/lib/store/hooks';
import type { EventId, InventoryId, Minor } from '@/types';

interface RowProps {
  itemId: InventoryId;
  title: string;
  subtitle?: string;
  price: Minor;
  max: number;
  badge?: React.ReactNode;
  qty: number;
  buyable: boolean;
  onQty: (itemId: InventoryId, qty: number) => void;
}

function Row({ itemId, title, subtitle, price, max, badge, qty, buyable, onQty }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <Orb name={title} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          {title} {badge}
        </div>
        {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
        <Money amount={price} className="text-sm font-semibold text-text" />
      </div>
      {buyable && max > 0 ? <QtyStepper value={qty} onChange={(q) => onQty(itemId, q)} max={Math.min(10, max)} /> : <Badge tone="bad">Sold out</Badge>}
    </div>
  );
}

export default function EventPage() {
  const { id } = useParams<{ id: EventId }>();
  const { world, me } = useViewer();
  const router = useRouter();
  const [cart, setCart] = useState<Record<InventoryId, number>>({});
  const event = byId(world.events, id);

  if (!event) return <EmptyState title="Event not found" action={<BackLink href="/discover" />} />;

  const venue = byId(world.businesses, event.venueId)!;
  const tickets = world.inventory.filter((i) => i.type === 'TICKET' && i.eventId === event.id);
  const tables = world.inventory.filter((i) => i.type === 'TABLE' && i.venueId === event.venueId);
  const drinks = world.inventory.filter((i) => i.type === 'DRINK_PREORDER' && i.venueId === event.venueId);
  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId: itemId as InventoryId, qty }));
  const { total } = priceCart(world, lines);
  const buyable = event.status === 'PUBLISHED';
  const set = (itemId: InventoryId, qty: number) => setCart((c) => ({ ...c, [itemId]: qty }));

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/discover" label="Discover" />
        {!me.businessIds.includes(venue.id) && <ReportButton target={{ kind: 'EVENT', id: event.id }} />}
      </div>
      <Cover cover={event.cover} photo={eventPhoto(event.cover)} className="mt-4 flex min-h-56 flex-col justify-end rounded-card p-6 text-white">
        <h1 className="text-display">{event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm opacity-90">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDateTime(event.date)}</span>
          <Link href={`/venues/${venue.id}`} className="flex items-center gap-1.5 hover:underline"><MapPin className="size-4" /> {venue.name}</Link>
          <span>{event.genres.join(' · ')}</span>
        </div>
      </Cover>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {event.status !== 'PUBLISHED' && (
            <div className="rounded-tile bg-warn-soft px-4 py-3 text-sm text-warn">{event.status === 'SOLD_OUT' ? 'This event is sold out.' : event.status === 'COMPLETED' ? 'This event has already happened.' : 'This event isn’t on sale.'}</div>
          )}
          <Card>
            <CardHeader title="Tickets" />
            <div className="flex flex-col gap-1">
              {tickets.map((t) => t.type === 'TICKET' && <Row key={t.id} itemId={t.id} qty={cart[t.id] ?? 0} buyable={buyable} onQty={set} title={TICKET_TIER_LABEL[t.tier]} subtitle={`${t.capacity - t.sold} left`} price={t.price} max={t.capacity - t.sold} badge={t.tier === 'VIP' ? <Badge tone="brand">VIP</Badge> : undefined} />)}
            </div>
          </Card>
          <Card>
            <CardHeader title="Reserve a table" subtitle="Tables include entry for the whole group." />
            <div className="flex flex-col gap-1">
              {tables.map((t) => t.type === 'TABLE' && <Row key={t.id} itemId={t.id} qty={cart[t.id] ?? 0} buyable={buyable} onQty={set} title={t.name} subtitle={`Seats ${t.capacity} · ${t.perks.join(' · ')}`} price={t.price} max={t.available} />)}
            </div>
          </Card>
          <Card>
            <CardHeader title="Pre-order bottles" subtitle="Bottle service only: chilled and waiting at your table." />
            <div className="flex flex-col gap-1">
              {drinks.map((d) => d.type === 'DRINK_PREORDER' && <Row key={d.id} itemId={d.id} qty={cart[d.id] ?? 0} buyable={buyable} onQty={set} title={d.name} subtitle={d.description} price={d.price} max={10} />)}
            </div>
          </Card>
          <Card>
            <CardHeader title="About" />
            <p className="text-sm leading-relaxed text-muted">{event.description}</p>
            <h4 className="mt-5 mb-2 text-sm font-semibold text-text">Lineup</h4>
            <div className="flex flex-col gap-1">
              {event.lineup.map((a) => (
                <ArtistLine key={a} world={world} artistId={a} />
              ))}
            </div>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-20">
            <CardHeader title="Your order" />
            {lines.length === 0 ? (
              <p className="text-sm text-muted">Select tickets, a table or bottles.</p>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                {priceCart(world, lines).lines.map((l) => (
                  <div key={l.itemId} className="flex justify-between text-muted">
                    <span>{l.qty}× {l.name.split(':').pop()}</span>
                    <Money amount={(l.unit * l.qty) as Minor} />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-between border-t border-border pt-3 font-semibold text-text">
              <span>Total</span>
              <Money amount={total} />
            </div>
            <Button block size="lg" className="mt-4" disabled={!lines.length} icon={<Ticket className="size-4" />} onClick={() => router.push(`/checkout?items=${lines.map((l) => `${l.itemId}:${l.qty}`).join(',')}`)}>
              Checkout
            </Button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" /> Paid into escrow, released to the venue after check-in.</p>
          </Card>
        </div>
      </div>

      {/* Mobile checkout bar */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-20 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 lg:hidden">
          <div>
            <div className="text-xs text-muted">{lines.reduce((a, l) => a + l.qty, 0)} items</div>
            <Money amount={total} className="text-heading text-text" />
          </div>
          <Button size="lg" onClick={() => router.push(`/checkout?items=${lines.map((l) => `${l.itemId}:${l.qty}`).join(',')}`)} icon={<ShieldCheck className="size-4" />}>
            Checkout
          </Button>
        </div>
      )}
    </div>
  );
}
