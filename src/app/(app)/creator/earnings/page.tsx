'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { ExportButton } from '@/components/shared/ExportButton';
import { PayoutModal } from '@/components/shared/WalletModals';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { ESCROW_LABEL, ESCROW_TONE, JOB_STATUS_LABEL, JOB_TONE, PAYOUT_METHOD_LABEL } from '@/lib/constants/labels';
import { bps, formatDate, formatKES } from '@/lib/format';
import { byId, currentPolicy, isPendingInvite, partyName, payeeShare, personRef, samePartyRef } from '@/lib/selectors';
import { fileSlug, statementRows, today } from '@/lib/csv';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';
import { PayMark } from '@/components/ui/Visuals';

export default function CreatorEarningsPage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const ref = personRef(me.id);
  const [payout, setPayout] = useState(false);
  const policy = currentPolicy(world);

  const rows = world.jobs
    .filter((j) => j.artistId === artist.id && !isPendingInvite(j) && j.status !== 'CANCELLED')
    .map((job) => ({ job, escrow: byId(world.escrows, job.escrowId), campaign: byId(world.campaigns, job.campaignId) }));
  const sum = (pred: (state: string) => boolean) => rows.reduce((a, r) => (r.escrow && pred(r.escrow.state) ? a + payeeShare(r.escrow) : a), 0) as Minor;
  const held = sum((s) => s === 'FUNDS_HELD');
  const releasing = sum((s) => s === 'FULFILLED');
  const released = sum((s) => s === 'RELEASED');
  const payouts = world.payouts.filter((p) => samePartyRef(p.party, ref));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Creator earnings" subtitle="Each job’s fee is held in escrow and released when the brand confirms your work." action={
          <div className="flex flex-wrap gap-2">
            <ExportButton filename={`${fileSlug(world, ref)}-statement-${today()}`} build={() => statementRows(world, ref)} label="Statement" />
            <Button icon={<Send className="size-4" />} onClick={() => setPayout(true)} disabled={me.wallet.balance <= 0}>Withdraw</Button>
          </div>
        } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available to withdraw" value={<Money amount={me.wallet.balance} />} hint={`Min. payout ${formatKES(policy.minPayoutThreshold)}`} />
        <Stat label="In escrow (jobs in progress)" value={<Money amount={held} />} />
        <Stat label="Confirmed, releasing" value={<Money amount={releasing} />} hint={`${policy.escrowHoldHours}h hold after confirmation`} />
        <Stat label="Released from jobs" value={<Money amount={released} />} hint={`Platform fee on creator jobs: ${policy.creatorJobFeeBps / 100}%`} />
      </div>

      <Card>
        <CardHeader title="Per-job payments" subtitle="Your share after the creator-job fee" />
        {rows.length === 0 ? (
          <EmptyState title="No jobs yet" body="Accepted invites and proposals show up here with their escrow status." />
        ) : (
          <div className="flex flex-col gap-1">
            {rows.map(({ job, escrow, campaign }) => (
              <Link key={job.id} href={`/creator/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:opacity-80">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{campaign?.title}</div>
                  <div className="text-xs text-muted">
                    {campaign && partyName(world, { kind: 'BUSINESS', id: campaign.brandId })} · fee {formatKES(job.fee)} − {formatKES(escrow ? (job.fee - payeeShare(escrow)) as Minor : bps(job.fee, policy.creatorJobFeeBps))} fee
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={job.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[job.status]} />
                  {escrow && <StatusPill status={escrow.state} tones={ESCROW_TONE} label={ESCROW_LABEL[escrow.state]} />}
                </div>
                <Money amount={escrow ? payeeShare(escrow) : job.fee} className="w-24 text-right text-sm font-semibold text-text" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Payout history" subtitle={artist.payout ? `To ${PAYOUT_METHOD_LABEL[artist.payout.method]} · ${artist.payout.account}. Payouts come from your one Selah wallet.` : undefined} />
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-3"><PayMark method={p.method} /><span className="flex flex-col"><span className="font-medium text-text">To {PAYOUT_METHOD_LABEL[p.method]}</span><span className="text-xs text-muted">{formatDate(p.at)}</span></span></span>
                <Money amount={p.amount} className="font-semibold text-text" />
              </div>
            ))}
          </div>
        )}
      </Card>
      {payout && <PayoutModal open onClose={() => setPayout(false)} party={ref} balance={me.wallet.balance} defaultMethod={artist.payout?.method} destination={artist.payout?.account ?? me.phone} />}
    </div>
  );
}
