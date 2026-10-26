'use client';

import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState, Money, Orb, PageHeader, StatusPill } from '@/components/ui/Display';
import { AD_CAMPAIGN_TONE } from '@/lib/constants/labels';
import { ProgressBar } from '@/components/ui/Visuals';
import { formatCount, formatDate } from '@/lib/format';
import { useViewer } from '@/lib/store/hooks';

export default function AdCampaignsPage() {
  const { world, business } = useViewer();
  const list = world.adCampaigns.filter((c) => c.brandId === business!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ad campaigns" subtitle="Screen campaigns you’ve booked, with live delivery numbers." action={<LinkButton href="/biz/ads" icon={<Plus className="size-4" />}>New campaign</LinkButton>} />
      {list.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-8" />} title="No campaigns yet" body="Pick screens in the ad marketplace to run your first campaign." action={<LinkButton href="/biz/ads">Open ad marketplace</LinkButton>} />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((c) => (
            <Link key={c.id} href={`/biz/ads/campaigns/${c.id}`} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card transition hover:shadow-raised">
              <div className="flex items-start justify-between gap-3">
                <Orb name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-text">{c.name}</div>
                  <div className="text-xs text-muted">{formatDate(c.startDate)} – {formatDate(c.endDate)} · {c.slotIds.length} screens</div>
                </div>
                <StatusPill status={c.status} tones={AD_CAMPAIGN_TONE} />
              </div>
              <ProgressBar value={c.spend} max={c.budget} />
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-muted">{formatCount(c.impressions)} impressions · {c.plays} plays</span>
                <span className="text-text"><Money amount={c.spend} /> of <Money amount={c.budget} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
