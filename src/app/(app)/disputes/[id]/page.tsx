'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { EscrowPanel } from '@/components/shared/Escrow';
import { Card, CardHeader, DefinitionList, EmptyState, PageHeader, StatusPill } from '@/components/ui/Display';
import { Timeline } from '@/components/ui/Visuals';
import { DISPUTE_TONE } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { DisputeId } from '@/types';

export default function DisputePage() {
  const { id } = useParams<{ id: DisputeId }>();
  const { world } = useViewer();
  const d = byId(world.disputes, id);
  if (!d) return <EmptyState title="Dispute not found" action={<BackLink href="/orders" />} />;
  const escrow = byId(world.escrows, d.escrowId)!;
  const backHref = escrow.subject.kind === 'ORDER' ? `/orders/${escrow.subject.id}` : '/my-bookings';
  const resolved = d.status === 'RESOLVED_BUYER' || d.status === 'RESOLVED_SELLER';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={<BackLink href={backHref} />} title={`Dispute: ${d.reason}`} subtitle={`Opened ${formatDateTime(d.createdAt)}`} action={<StatusPill status={d.status} tones={DISPUTE_TONE} />} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Progress" />
          <Timeline steps={['OPEN', 'UNDER_REVIEW', resolved ? d.status : 'RESOLVED_BUYER'] as const} current={d.status === 'ESCALATED' ? 'UNDER_REVIEW' : d.status} labels={{ RESOLVED_BUYER: 'Resolved' }} failed={d.status === 'ESCALATED' ? 'ESCALATED' : undefined} />
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            {!resolved && <Loader2 className="size-4 animate-spin text-brand" />}
            {d.status === 'OPEN' && 'Received. A member of the Selah team will pick this up shortly.'}
            {d.status === 'UNDER_REVIEW' && 'Our team is reviewing the evidence from both sides.'}
            {d.status === 'RESOLVED_BUYER' && 'Resolved in the buyer’s favour. The payment has been refunded to the Selah wallet.'}
            {d.status === 'RESOLVED_SELLER' && 'Resolved in the seller’s favour. The payment has been released.'}
            {d.status === 'ESCALATED' && 'Escalated to senior review.'}
          </p>
        </Card>
        <Card>
          <CardHeader title="Details" />
          <DefinitionList items={[['Raised by', partyName(world, d.raisedBy)], ['Against', partyName(world, escrow.payee)], ['Reason', d.reason]]} />
          <p className="mt-3 border-t border-border pt-3 text-sm text-text">{d.details}</p>
        </Card>
        <EscrowPanel escrow={escrow} />
      </div>
    </div>
  );
}
