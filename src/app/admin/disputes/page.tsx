'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PartyLink, Table } from '@/components/admin/AdminUI';
import { Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { activeDisputes } from '@/lib/admin';
import { DISPUTE_TONE, humanize } from '@/lib/constants/labels';
import { timeAgo } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';

export default function AdminDisputesPage() {
  const w = useWorld();
  const [tab, setTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const active = activeDisputes(w);
  const list = tab === 'ACTIVE' ? active : w.disputes.filter((d) => !active.includes(d));

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Funds stay frozen until you resolve for the buyer (refund), the seller (release), or escalate." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'ACTIVE', label: 'Active', count: active.length }, { value: 'CLOSED', label: 'Closed', count: w.disputes.length - active.length }]} />
      <Table
        head={['Dispute', 'Raised by', 'Against', 'On', 'Amount', 'Status']}
        empty={tab === 'ACTIVE' ? 'No open disputes. Nice.' : 'Nothing resolved yet.'}
        rows={list.map((d) => {
          const e = byId(w.escrows, d.escrowId);
          return [
            <Link key="d" href={`/admin/disputes/${d.id}`} className="flex flex-col hover:text-brand">
              <span className="font-medium">{d.reason}</span>
              <span className="text-xs text-muted">{timeAgo(d.createdAt)}</span>
            </Link>,
            <PartyLink key="r" world={w} party={d.raisedBy} />,
            e ? <PartyLink key="a" world={w} party={e.payee} /> : '–',
            <span key="o" className="text-muted">{e ? humanize(e.subject.kind) : '–'}</span>,
            e ? <Money key="m" amount={e.amount} /> : '–',
            <StatusPill key="s" status={d.status} tones={DISPUTE_TONE} />,
          ];
        })}
      />
    </div>
  );
}
