'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bell, ChevronRight, Settings, ShieldCheck, Wallet } from 'lucide-react';
import { BusinessLabelBadge, CAPABILITY_ICON, ReadinessBanner } from '@/components/shared/Business';
import { LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, Money, PageHeader, Stat } from '@/components/ui/Display';
import { BUSINESS_CAPABILITY, type BusinessCapability } from '@/lib/constants/enums';
import { CAPABILITY_LABEL } from '@/lib/constants/labels';
import { formatCount } from '@/lib/format';
import { heldFor, samePartyRef, unreadCount, walletOf } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessAccount, Minor, World } from '@/types';

type WidgetProps = { world: World; business: BusinessAccount };
type Metric = { label: string; value: ReactNode };
type Todo = { label: string; count: number; href: string };

/** Each capability contributes one dashboard section: a few numbers and the next things to do. */
function widget(world: World, b: BusinessAccount, cap: BusinessCapability): { metrics: Metric[]; todos: Todo[]; href: string } {
  const me = { kind: 'BUSINESS', id: b.id } as const;
  switch (cap) {
    case 'SELL_VENUE_INVENTORY': {
      const events = world.events.filter((e) => e.venueId === b.id);
      const orders = world.orders.filter((o) => samePartyRef(o.seller, me));
      const tickets = world.inventory.filter((i) => i.venueId === b.id && i.type === 'TICKET').reduce((a, i) => a + (i.type === 'TICKET' ? i.sold : 0), 0);
      const sales = orders.filter((o) => o.status !== 'REFUNDED').reduce((a, o) => a + o.total, 0) as Minor;
      return {
        href: '/biz/events',
        metrics: [
          { label: 'Live events', value: events.filter((e) => e.status === 'PUBLISHED').length },
          { label: 'Tickets sold', value: formatCount(tickets) },
          { label: 'Gross sales', value: <Money amount={sales} compact /> },
        ],
        todos: [
          { label: 'Orders waiting for check-in', count: orders.filter((o) => o.status === 'PAID').length, href: '/biz/check-in' },
          { label: 'Draft events to publish', count: events.filter((e) => e.status === 'DRAFT').length, href: '/biz/events' },
          { label: 'Ad slots booked by brands', count: world.inventory.filter((i) => i.venueId === b.id && i.type === 'AD_SLOT' && i.status === 'BOOKED').length, href: '/biz/ad-slots' },
        ],
      };
    }
    case 'BUY_ARTIST_BOOKINGS': {
      const requests = world.bookingRequests.filter((r) => samePartyRef(r.buyer, me));
      const bookings = world.bookings.filter((x) => samePartyRef(x.buyer, me));
      return {
        href: '/biz/bookings',
        metrics: [
          { label: 'Upcoming gigs', value: bookings.filter((x) => x.status === 'SCHEDULED').length },
          { label: 'Open requests', value: requests.filter((r) => r.status === 'PENDING' || r.status === 'NEGOTIATING').length },
          { label: 'Artists booked', value: new Set(bookings.map((x) => x.artistId)).size },
        ],
        todos: [
          { label: 'Artist proposals to review', count: world.pitches.filter((p) => p.to === b.id && (p.status === 'SENT' || p.status === 'VIEWED')).length, href: '/biz/bookings?tab=proposals' },
          { label: 'Counter-offers to answer', count: requests.filter((r) => r.status === 'NEGOTIATING' && r.counterOffers.at(-1)?.by === 'ARTIST').length, href: '/biz/bookings' },
          { label: 'Contracts to sign or pay', count: bookings.filter((x) => x.status === 'AWAITING_SIGNATURES' || x.status === 'CONTRACT_SIGNED').length, href: '/biz/contracts' },
        ],
      };
    }
    case 'BUY_AD_INVENTORY': {
      const campaigns = world.adCampaigns.filter((c) => c.brandId === b.id);
      return {
        href: '/biz/ads/campaigns',
        metrics: [
          { label: 'Running', value: campaigns.filter((c) => c.status === 'RUNNING' || c.status === 'SCHEDULED').length },
          { label: 'Impressions', value: formatCount(campaigns.reduce((a, c) => a + c.impressions, 0)) },
          { label: 'Spend', value: <Money amount={campaigns.reduce((a, c) => a + c.spend, 0) as Minor} compact /> },
        ],
        todos: [{ label: 'Screens available to book', count: world.inventory.filter((i) => i.type === 'AD_SLOT' && i.status === 'AVAILABLE' && i.venueId !== b.id).length, href: '/biz/ads' }],
      };
    }
    case 'COMMISSION_CREATOR_JOBS': {
      const campaigns = world.campaigns.filter((c) => c.brandId === b.id);
      const ids = new Set(campaigns.map((c) => c.id));
      const jobs = world.jobs.filter((j) => ids.has(j.campaignId));
      return {
        href: '/biz/campaigns',
        metrics: [
          { label: 'Open campaigns', value: campaigns.filter((c) => c.status === 'OPEN').length },
          { label: 'Active jobs', value: jobs.filter((j) => j.status !== 'PAID' && j.status !== 'CANCELLED').length },
          { label: 'Paid out', value: <Money amount={jobs.filter((j) => j.status === 'PAID').reduce((a, j) => a + j.fee, 0) as Minor} compact /> },
        ],
        todos: [
          { label: 'Proposals to review', count: world.proposals.filter((p) => ids.has(p.campaignId) && (p.status === 'SUBMITTED' || p.status === 'SHORTLISTED')).length, href: '/biz/campaigns' },
          { label: 'Drafts to approve', count: jobs.filter((j) => j.status === 'DRAFT_SUBMITTED').length, href: '/biz/jobs' },
          { label: 'Posts to confirm', count: jobs.filter((j) => j.status === 'POSTED' || (j.jobType === 'INSIGHTS' && j.status === 'APPROVED')).length, href: '/biz/jobs' },
        ],
      };
    }
  }
}

function CapabilitySection({ world, business, cap }: WidgetProps & { cap: BusinessCapability }) {
  const Icon = CAPABILITY_ICON[cap];
  const { metrics, todos, href } = widget(world, business, cap);
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Icon className="size-4 text-brand" /> {CAPABILITY_LABEL[cap]}</span>} action={<Link href={href} className="text-sm text-brand hover:underline">Open</Link>} />
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-heading text-text">{m.value}</div>
            <div className="text-xs text-muted">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {todos.map((t) => (
          <Link key={t.label} href={t.href} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80">
            <span className="text-text">{t.label}</span>
            <span className="flex items-center gap-1">
              <span className={t.count ? 'rounded-full bg-brand px-2 text-xs font-semibold text-on-brand' : 'text-xs text-muted'}>{t.count}</span>
              <ChevronRight className="size-4 text-muted" />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function BusinessHome() {
  const { world, actingAs, business } = useViewer();
  const b = business!;
  const welcome = useSearchParams().get('welcome') === '1';
  // Dashboard = base + union(capability sections), in canonical capability order.
  const sections = BUSINESS_CAPABILITY.filter((c) => b.capabilities.includes(c));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={b.name} subtitle={<span className="flex flex-wrap items-center gap-2"><BusinessLabelBadge business={b} /> {b.address}</span>} action={<LinkButton href="/biz/settings" variant="outline" icon={<Settings className="size-4" />}>Settings</LinkButton>} />

      {welcome && (
        <div className="rounded-card bg-good-soft p-4 text-good">
          <div className="font-semibold">{b.name} is live on Selah</div>
          <div className="text-sm">Your dashboard below is built from the capabilities you picked. Switch back to your personal account any time from the account menu.</div>
        </div>
      )}
      <ReadinessBanner business={b} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Wallet" value={<Money amount={walletOf(world, actingAs)} />} icon={<Wallet className="size-4" />} hint={<Link href="/wallet" className="text-brand hover:underline">Top up or withdraw</Link>} />
        <Stat label="Owed to you in escrow" value={<Money amount={heldFor(world, actingAs)} />} icon={<ShieldCheck className="size-4" />} hint="Released after fulfilment" />
        <Stat label="Unread notifications" value={unreadCount(world, actingAs)} icon={<Bell className="size-4" />} hint={<Link href="/notifications" className="text-brand hover:underline">View all</Link>} />
      </div>

      {sections.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No capabilities are on yet. Turn some on in <Link href="/biz/settings#capabilities" className="text-brand hover:underline">Business settings</Link> to add tools here.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((c) => (
            <CapabilitySection key={c} world={world} business={b} cap={c} />
          ))}
        </div>
      )}
    </div>
  );
}
