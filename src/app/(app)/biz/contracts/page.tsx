'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, FileSignature } from 'lucide-react';
import { ContractCard } from '@/components/shared/Contract';
import { Card, EmptyState, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { CONTRACT_TONE } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { byId, findArtist, personRef, samePartyRef } from '@/lib/selectors';
import { signContract } from '@/lib/store/actions/bookings';
import { useViewer } from '@/lib/store/hooks';
import type { Contract, ContractId, PartyRef } from '@/types';

type Tab = 'action' | 'active' | 'done';

export default function ContractsPage() {
  const { world, actingAs, business } = useViewer();
  const b = business!;
  const [tab, setTab] = useState<Tab>('action');
  const [open, setOpen] = useState<ContractId | null>(null);

  // Every contract this business is party to: artist bookings it bought, and creator jobs it commissioned.
  const rows = world.contracts.flatMap((c) => {
    if (c.subject.kind === 'BOOKING') {
      const bk = byId(world.bookings, c.subject.id);
      if (!bk || !samePartyRef(bk.buyer, actingAs)) return [];
      const artist = findArtist(world, bk.artistId);
      const needsPay = bk.status === 'CONTRACT_SIGNED';
      return [{ c, other: artist?.stageName ?? 'Artist', parties: [bk.buyer, personRef(artist!.personId)] as PartyRef[], href: `/biz/bookings/${bk.requestId}`, date: bk.date, needsPay }];
    }
    const job = byId(world.jobs, c.subject.id);
    const campaign = job && byId(world.campaigns, job.campaignId);
    if (!job || campaign?.brandId !== b.id) return [];
    const artist = findArtist(world, job.artistId);
    return [{ c, other: artist?.stageName ?? 'Creator', parties: [actingAs, personRef(artist!.personId)], href: `/biz/jobs/${job.id}`, date: campaign.deadline, needsPay: false }];
  });
  const mySignatureMissing = (c: Contract) => c.status === 'SENT' && !c.signedBy.some((p) => samePartyRef(p, actingAs));
  const bucket = (r: (typeof rows)[number]): Tab => (mySignatureMissing(r.c) || r.needsPay ? 'action' : r.c.status === 'COMPLETED' || r.c.status === 'CANCELLED' ? 'done' : 'active');
  const list = rows.filter((r) => bucket(r) === tab).sort((a, c) => c.c.createdAt.localeCompare(a.c.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Contracts" subtitle="Performance agreements with artists and creator agreements, signed in-app." />
      <Tabs value={tab} onChange={setTab} tabs={(['action', 'active', 'done'] as const).map((t) => ({ value: t, label: { action: 'Needs action', active: 'Active', done: 'Completed' }[t], count: rows.filter((r) => bucket(r) === t).length }))} />
      {list.length === 0 ? (
        <EmptyState icon={<FileSignature className="size-8" />} title="Nothing here" body={tab === 'action' ? 'You’re all caught up. Contracts appear once an artist accepts a booking.' : 'No contracts in this list yet.'} />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <div key={r.c.id} className="flex flex-col gap-3">
              <Card padded={false}>
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === r.c.id ? null : r.c.id)}>
                  <FileSignature className="size-5 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{r.c.title}</div>
                    <div className="text-xs text-muted">{r.other} · {formatDate(r.date)} · {r.c.signedBy.length}/2 signed{r.needsPay ? ' · payment due' : ''}</div>
                  </div>
                  <StatusPill status={r.c.status} tones={CONTRACT_TONE} />
                  <ChevronDown className={cn('size-4 text-muted transition', open === r.c.id && 'rotate-180')} />
                </button>
              </Card>
              {open === r.c.id && (
                <>
                  <ContractCard world={world} contract={r.c} parties={r.parties} me={actingAs} onSign={() => { signContract(r.c.id, actingAs); toast('Signed. Waiting for the countersignature.'); }} />
                  <Link href={r.href} className="self-end text-sm font-medium text-brand hover:underline">{r.needsPay ? 'Pay into escrow →' : 'Open details →'}</Link>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
