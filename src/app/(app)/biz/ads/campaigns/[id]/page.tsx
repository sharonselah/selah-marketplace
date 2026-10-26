'use client';

import { useParams } from 'next/navigation';
import { Eye, Film, Loader2, PlayCircle, Wallet } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { EscrowPanel } from '@/components/shared/Escrow';
import { Card, CardHeader, EmptyState, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { ProgressBar, Timeline } from '@/components/ui/Visuals';
import { AD_CAMPAIGN_TONE } from '@/lib/constants/labels';
import { formatCount, formatDate } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import { quoteAdCampaign } from '@/lib/store/actions/ads';
import { useViewer } from '@/lib/store/hooks';
import type { AdCampaignId } from '@/types';

export default function AdCampaignDetail() {
  const { id } = useParams<{ id: AdCampaignId }>();
  const { world, business } = useViewer();
  const c = byId(world.adCampaigns, id);
  if (!c || c.brandId !== business!.id) return <EmptyState title="Campaign not found" action={<BackLink href="/biz/ads/campaigns" label="Ad campaigns" />} />;
  const { reach, slots } = quoteAdCampaign(world, c.slotIds, c.startDate, c.endDate);
  const escrows = c.escrowIds.flatMap((eid) => {
    const e = byId(world.escrows, eid);
    return e ? [e] : [];
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader back={<BackLink href="/biz/ads/campaigns" label="Ad campaigns" />} title={c.name} subtitle={`${formatDate(c.startDate)} – ${formatDate(c.endDate)}${c.invoiceNo ? ` · Invoice ${c.invoiceNo}` : ''}`} action={<StatusPill status={c.status} tones={AD_CAMPAIGN_TONE} />} />
      <Card>
        <Timeline steps={['SCHEDULED', 'RUNNING', 'COMPLETED'] as const} current={c.status === 'DRAFT' ? 'SCHEDULED' : c.status} labels={{ SCHEDULED: 'Booked', RUNNING: 'On screens', COMPLETED: 'Completed' }} />
        {c.status !== 'COMPLETED' && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-brand" /> {c.status === 'SCHEDULED' ? 'Venues are loading your creative…' : 'Playing now. Numbers update as venues report plays.'}
          </p>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Impressions" value={formatCount(c.impressions)} hint={`of ~${formatCount(reach)} estimated`} icon={<Eye className="size-4" />} />
        <Stat label="Plays" value={c.plays} icon={<PlayCircle className="size-4" />} />
        <Stat label="Spend" value={<Money amount={c.spend} />} hint={<>of <Money amount={c.budget} /></>} icon={<Wallet className="size-4" />} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Screens" />
          <div className="flex flex-col gap-1">
            {slots.map((s) => (
              <div key={s.id} className="py-2.5 text-sm">
                <div className="font-medium text-text">{byId(world.businesses, s.venueId)?.name}</div>
                <div className="text-xs text-muted">{s.name} · ~{formatCount(s.reachEstimate)} / night</div>
              </div>
            ))}
          </div>
          <ProgressBar value={c.impressions} max={reach} className="mt-3" />
        </Card>
        <Card>
          <CardHeader title="Creative" />
          {c.creative.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-1.5 text-sm text-text">
              <Film className="size-4 text-muted" /> {f.name} <span className="text-xs text-muted">({f.kind.toLowerCase()})</span>
            </div>
          ))}
        </Card>
      </div>
      {escrows.map((e) => (
        <EscrowPanel key={e.id} escrow={e} showSplits title={`Payment to ${partyName(world, e.payee)}`} />
      ))}
    </div>
  );
}
