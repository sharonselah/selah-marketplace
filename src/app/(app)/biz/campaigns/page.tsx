'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { TierBadge } from '@/components/shared/Creator';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState, Money, Orb, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { ProgressBar } from '@/components/ui/Visuals';
import type { CampaignStatus } from '@/lib/constants/enums';
import { CAMPAIGN_TONE, JOB_TYPE_LABEL } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { useViewer } from '@/lib/store/hooks';

type Filter = 'live' | 'DRAFT' | 'done';
const BUCKET: Record<CampaignStatus, Filter> = { OPEN: 'live', FILLED: 'live', DRAFT: 'DRAFT', CLOSED: 'done', CANCELLED: 'done' };

export default function CampaignsPage() {
  const { world, business } = useViewer();
  const [filter, setFilter] = useState<Filter>('live');
  const mine = world.campaigns.filter((c) => c.brandId === business!.id);
  const list = mine.filter((c) => BUCKET[c.status] === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Creator campaigns" subtitle="Brief creators, review proposals and track spend." action={<LinkButton href="/biz/campaigns/new" icon={<Plus className="size-4" />}>New campaign</LinkButton>} />
      <Tabs value={filter} onChange={setFilter} tabs={(['live', 'DRAFT', 'done'] as const).map((f) => ({ value: f, label: { live: 'Live', DRAFT: 'Drafts', done: 'Closed' }[f], count: mine.filter((c) => BUCKET[c.status] === f).length }))} />
      {list.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-8" />} title="No campaigns here" body="Create a campaign: pick a job type, the creator tiers you want and your budget." action={<LinkButton href="/biz/campaigns/new">New campaign</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => {
            const jobs = world.jobs.filter((j) => j.campaignId === c.id && j.status !== 'CANCELLED');
            const pending = world.proposals.filter((p) => p.campaignId === c.id && (p.status === 'SUBMITTED' || p.status === 'SHORTLISTED')).length;
            return (
              <Link key={c.id} href={`/biz/campaigns/${c.id}`} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card transition hover:shadow-raised">
                <div className="flex items-start justify-between gap-2">
                  <Orb name={c.title} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-text">{c.title}</div>
                    <div className="text-xs text-muted">{JOB_TYPE_LABEL[c.jobType]} · due {formatDate(c.deadline)}</div>
                  </div>
                  <StatusPill status={c.status} tones={CAMPAIGN_TONE} />
                </div>
                <div className="flex flex-wrap gap-1">{c.tiers.map((t) => <TierBadge key={t} tier={t} />)}</div>
                <ProgressBar value={jobs.length} max={c.slots} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{jobs.length}/{c.slots} creators{pending ? ` · ${pending} proposals to review` : ''}</span>
                  <Money amount={c.feePerCreator} className="font-medium text-text" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
