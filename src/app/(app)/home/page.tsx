'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { ArtistCard, EventCard } from '@/components/shared/Cards';
import { LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, Cover, Money, StatusPill } from '@/components/ui/Display';
import { ORDER_TONE } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { artists, byId, heldFor, isArtistSeller, samePartyRef } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import { eventPhoto } from '@/lib/data/photos';

export default function HomePage() {
  const { world, me, actingAs } = useViewer();
  const firstName = me.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const myOrders = world.orders.filter((o) => samePartyRef(o.buyer, actingAs) && (o.status === 'PAID' || o.status === 'FULFILLED'));
  const upcoming = world.events.filter((e) => e.status === 'PUBLISHED' || e.status === 'SOLD_OUT').slice(0, 6);
  const featuredArtists = artists(world).filter((a) => isArtistSeller(a) && a.verification === 'VERIFIED_ARTIST' && a.personId !== me.id).slice(0, 4);
  const held = heldFor(world, actingAs);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-title text-text">{firstName}</h1>
        </div>
        <LinkButton href="/discover" variant="outline">
          Explore tonight
        </LinkButton>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cover-g4 border-0 text-white md:col-span-1">
          <div className="text-sm opacity-80">Wallet balance</div>
          <div className="mt-1 text-display">
            <Money amount={me.wallet.balance} />
          </div>
          {held > 0 && <div className="mt-1 text-xs opacity-80">+ <Money amount={held} /> pending release</div>}
          <div className="mt-4 flex gap-2">
            <LinkButton href="/wallet?topup=1" size="sm" className="bg-white text-brand hover:bg-white/90" icon={<Plus className="size-4" />}>
              Top up
            </LinkButton>
            <LinkButton href="/wallet" size="sm" variant="ghost" className="text-white hover:bg-white/10">
              History
            </LinkButton>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Your upcoming plans" action={<Link href="/orders" className="text-sm text-brand hover:underline">All orders</Link>} />
          {myOrders.length === 0 ? (
            <p className="text-sm text-muted">No plans yet. Grab a ticket or reserve a table for this weekend.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {myOrders.slice(0, 3).map((o) => {
                const ev = byId(world.events, o.eventId);
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <Cover cover={ev?.cover ?? 'g1'} photo={ev ? eventPhoto(ev.cover) : undefined} className="size-11 shrink-0 rounded-tile" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">{ev?.title ?? o.lines[0].name}</div>
                      <div className="text-xs text-muted">{ev ? formatDate(ev.date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Digital'} · {o.lines.map((l) => `${l.qty}× ${l.name.split(':').pop()?.trim()}`).join(', ')}</div>
                    </div>
                    <StatusPill status={o.status} tones={ORDER_TONE} />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading text-text">Happening soon</h2>
          <Link href="/discover" className="flex items-center gap-1 text-sm text-brand hover:underline">
            See all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} world={world} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading text-text">Book a verified artist</h2>
          <Link href="/discover?tab=artists" className="flex items-center gap-1 text-sm text-brand hover:underline">
            Browse artists <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredArtists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t border-border pt-6 md:grid-cols-3">
        <Link href="/earn" className="group">
          <div className="flex items-center gap-1 font-semibold text-text group-hover:text-brand">Earn with Selah <ArrowRight className="size-4" /></div>
          <div className="text-sm text-muted">Refer friends, recruit artists, earn rewards.</div>
        </Link>
        {!me.artist ? (
          <Link href="/sell" className="group md:col-span-2">
            <div className="flex items-center gap-1 font-semibold text-text group-hover:text-brand">Want to sell? Add a role <ArrowRight className="size-4" /></div>
            <div className="text-sm text-muted">Become an Artist (DJ, MC, creator…) or add a Business Account for your venue or brand.</div>
          </Link>
        ) : (
          <Link href="/onboarding/business" className="group md:col-span-2">
            <div className="flex items-center gap-1 font-semibold text-text group-hover:text-brand">Run a business? Add a Business Account <ArrowRight className="size-4" /></div>
            <div className="text-sm text-muted">Sell tables and tickets, book artists, or advertise on venue screens.</div>
          </Link>
        )}
      </section>
    </div>
  );
}
