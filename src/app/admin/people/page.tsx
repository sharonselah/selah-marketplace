'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { SearchBox, Table, matches } from '@/components/admin/AdminUI';
import { Avatar, Badge, Money, PageHeader } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { CAPABILITY_LABEL, VERIFICATION_LABEL } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { BUSINESS_LABEL_TEXT, byId, displayLabel, personLabel } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';

export default function AdminPeoplePage() {
  const w = useWorld();
  const [tab, setTab] = useState<'PEOPLE' | 'BUSINESSES'>('PEOPLE');
  const [q, setQ] = useState('');
  const people = w.people.filter((p) => matches(q, p.name, p.artist?.stageName, p.phone, p.email, p.location));
  const businesses = w.businesses.filter((b) => matches(q, b.name, b.address, b.regTaxId));

  return (
    <div>
      <PageHeader title="People & businesses" subtitle="Every account in the world. Business labels are derived from capabilities." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'PEOPLE', label: 'People', count: w.people.length }, { value: 'BUSINESSES', label: 'Businesses', count: w.businesses.length }]} />
        <SearchBox value={q} onChange={setQ} placeholder={tab === 'PEOPLE' ? 'Name, phone, email…' : 'Name, address, KRA PIN…'} />
      </div>

      {tab === 'PEOPLE' ? (
        <Table
          head={['Person', 'Roles', 'Verification', 'Businesses', 'Wallet', 'Joined']}
          empty="No one matches that search."
          rows={people.map((p) => [
            <Link key="n" href={`/admin/people/${p.id}`} className="flex items-center gap-3 hover:text-brand">
              <Avatar name={p.name} size="sm" />
              <span className="flex flex-col">
                <span className="font-medium">{p.artist?.stageName ?? p.name}</span>
                <span className="text-xs text-muted">{p.artist ? p.name : p.phone}</span>
              </span>
            </Link>,
            p.isAdmin ? <Badge tone="brand">Admin</Badge> : <span className="text-muted">{personLabel(p)}</span>,
            <Badge key="v" tone={p.verification === 'PHONE_VERIFIED' ? 'neutral' : 'good'}>{VERIFICATION_LABEL[p.artist?.verification === 'VERIFIED_ARTIST' ? 'VERIFIED_ARTIST' : p.verification]}</Badge>,
            p.businessIds.length ? p.businessIds.map((id) => byId(w.businesses, id)?.name).join(', ') : <span className="text-muted">–</span>,
            <Money key="m" amount={p.wallet.balance} />,
            <span key="d" className="text-muted">{formatDate(p.createdAt)}</span>,
          ])}
        />
      ) : (
        <Table
          head={['Business', 'Derived label', 'Capabilities', 'Status', 'Owner', 'Wallet']}
          empty="No business matches that search."
          rows={businesses.map((b) => [
            <Link key="n" href={`/admin/people/${b.id}`} className="font-medium hover:text-brand">{b.name}</Link>,
            <Badge key="l" tone="brand">{BUSINESS_LABEL_TEXT[displayLabel(b)]}</Badge>,
            <span key="c" className="text-xs text-muted">{b.capabilities.map((c) => CAPABILITY_LABEL[c]).join(' · ') || 'None yet'}</span>,
            b.verified ? <Badge tone="good"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge tone="warn">Unverified</Badge>,
            <Link key="o" href={`/admin/people/${b.ownerId}`} className="hover:text-brand">{byId(w.people, b.ownerId)?.name ?? 'Unknown'}</Link>,
            <Money key="m" amount={b.wallet.balance} />,
          ])}
        />
      )}
    </div>
  );
}
