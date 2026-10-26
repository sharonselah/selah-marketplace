'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Table } from '@/components/admin/AdminUI';
import { BackLink } from '@/components/shared/Cards';
import { Avatar, Badge, Card, CardHeader, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import {
  ARTIST_CATEGORY_LABEL,
  CAPABILITY_LABEL,
  CREATOR_TIER_LABEL,
  PAYOUT_METHOD_LABEL,
  PRESET_LABEL,
  TRANSACTION_TONE,
  VENUE_TYPE_LABEL,
  VERIFICATION_LABEL,
} from '@/lib/constants/labels';
import { formatCount, formatDate, formatDateTime, formatPrice } from '@/lib/format';
import { BUSINESS_LABEL_TEXT, businessRef, byId, displayLabel, heldFor, personLabel, personRef, samePartyRef } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';
import type { BusinessAccount, BusinessId, PartyRef, Person, PersonId, World } from '@/types';

export default function AdminPartyPage() {
  const { id } = useParams<{ id: PersonId | BusinessId }>();
  const w = useWorld();
  const person = id.startsWith('per_') ? byId(w.people, id) : undefined;
  const business = id.startsWith('biz_') ? byId(w.businesses, id) : undefined;
  const back = <BackLink href="/admin/people" label="People & businesses" />;
  if (person) return <PersonView w={w} p={person} back={back} />;
  if (business) return <BusinessView w={w} b={business} back={back} />;
  return <EmptyState title="Account not found" action={back} />;
}

function Activity({ w, party }: { w: World; party: PartyRef }) {
  const txns = w.transactions.filter((t) => samePartyRef(t.party, party)).slice(0, 12);
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-text">Transactions</h2>
      <Table
        head={['When', 'Description', 'Status', 'Amount']}
        empty="No transactions yet."
        rows={txns.map((t) => [
          <span key="w" className="text-muted">{formatDateTime(t.at)}</span>,
          t.description,
          <StatusPill key="s" status={t.status} tones={TRANSACTION_TONE} />,
          <Money key="m" amount={(t.direction === 'OUT' ? -t.amount : t.amount) as typeof t.amount} className={t.direction === 'IN' ? 'text-good' : undefined} />,
        ])}
      />
    </div>
  );
}

function PersonView({ w, p, back }: { w: World; p: Person; back: ReactNode }) {
  const ref = personRef(p.id);
  const a = p.artist;
  return (
    <div>
      <PageHeader back={back} title={<span className="flex items-center gap-3"><Avatar name={p.name} />{a?.stageName ?? p.name}</span>} subtitle={`${p.isAdmin ? 'Admin' : personLabel(p)} · joined ${formatDate(p.createdAt)}`} />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Identity" />
          <DefinitionList
            items={[
              ['Legal name', p.name],
              ['Phone', p.phone],
              ['Email', p.email ?? '–'],
              ['Location', p.location],
              ['Verification', <Badge key="v" tone={p.verification === 'PHONE_VERIFIED' ? 'warn' : 'good'}>{VERIFICATION_LABEL[p.verification]}</Badge>],
              ['Wallet', <Money key="w" amount={p.wallet.balance} />],
              ['Held in escrow', <Money key="h" amount={heldFor(w, ref)} />],
              ['Referral code', p.referralCode],
            ]}
          />
        </Card>
        {a ? (
          <Card>
            <CardHeader title="Artist profile" action={<Link href={`/artists/${a.id}`} className="text-sm font-medium text-brand">Public profile</Link>} />
            <DefinitionList
              items={[
                ['Capabilities', a.capabilities.map((c) => CAPABILITY_LABEL[c]).join(', ')],
                ['Category', ARTIST_CATEGORY_LABEL[a.category]],
                ['Badge', <Badge key="b" tone={a.verification === 'VERIFIED_ARTIST' ? 'good' : 'neutral'}>{VERIFICATION_LABEL[a.verification]}</Badge>],
                ['Booking rate', formatPrice(a.pricing.booking)],
                ['Gigs · rating', `${a.gigsPlayed} · ${a.rating.toFixed(1)}★`],
                ['Payout', a.payout ? `${PAYOUT_METHOD_LABEL[a.payout.method]} ${a.payout.account}` : 'Not set'],
                ...(a.creator ? ([['Creator tier', `${CREATOR_TIER_LABEL[a.creator.tier]} · ${formatCount(a.creator.followerCount)} followers`]] as [string, string][]) : []),
              ]}
            />
          </Card>
        ) : (
          <Card>
            <CardHeader title="Businesses" />
            {p.businessIds.length ? <BusinessLinks w={w} ids={p.businessIds} /> : <p className="text-sm text-muted">No business accounts.</p>}
          </Card>
        )}
      </div>
      {a && p.businessIds.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Businesses" />
          <BusinessLinks w={w} ids={p.businessIds} />
        </Card>
      )}
      <Activity w={w} party={ref} />
    </div>
  );
}

function BusinessLinks({ w, ids }: { w: World; ids: BusinessId[] }) {
  return (
    <div className="flex flex-col gap-1">
      {ids.map((id) => {
        const b = byId(w.businesses, id);
        return b ? (
          <Link key={id} href={`/admin/people/${id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-brand">
            <span className="font-medium text-text">{b.name}</span>
            <Badge tone="brand">{BUSINESS_LABEL_TEXT[displayLabel(b)]}</Badge>
          </Link>
        ) : null;
      })}
    </div>
  );
}

function BusinessView({ w, b, back }: { w: World; b: BusinessAccount; back: ReactNode }) {
  const ref = businessRef(b.id);
  const owner = byId(w.people, b.ownerId);
  return (
    <div>
      <PageHeader
        back={back}
        title={b.name}
        subtitle={`${BUSINESS_LABEL_TEXT[displayLabel(b)]} · created ${formatDate(b.createdAt)}`}
        action={b.verified ? <Badge tone="good"><BadgeCheck className="size-3" /> Verified</Badge> : <Link href="/admin/verification"><Badge tone="warn">Unverified: review</Badge></Link>}
      />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <DefinitionList
            items={[
              ['Owner', owner ? <Link key="o" href={`/admin/people/${owner.id}`} className="hover:text-brand">{owner.name}</Link> : '–'],
              ['KRA PIN / reg.', b.regTaxId],
              ['Address', b.address],
              ['Contact', `${b.contactName} · ${b.contactPhone}`],
              ['Venue type', b.venueType ? VENUE_TYPE_LABEL[b.venueType] : '–'],
              ['Wallet', <Money key="w" amount={b.wallet.balance} />],
              ['Held in escrow', <Money key="h" amount={heldFor(w, ref)} />],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Composition" subtitle="Panels = base + union of capability panels. Label priority: Venue > Organiser > Brand." />
          <DefinitionList
            items={[
              ['Started from preset', PRESET_LABEL[b.preset]],
              ['Derived label', <Badge key="l" tone="brand">{BUSINESS_LABEL_TEXT[displayLabel(b)]}</Badge>],
              ['Payout', b.payout ? `${PAYOUT_METHOD_LABEL[b.payout.method]} ${b.payout.account}` : 'Not set'],
              ['Billing', b.billing ? (b.billing.mode === 'INVOICED' ? `Invoiced · ${b.billing.email}` : 'Prepaid wallet') : 'Not set'],
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {b.capabilities.length ? b.capabilities.map((c) => <Badge key={c}>{CAPABILITY_LABEL[c]}</Badge>) : <span className="text-sm text-muted">No capabilities yet.</span>}
          </div>
        </Card>
      </div>
      <Activity w={w} party={ref} />
    </div>
  );
}
