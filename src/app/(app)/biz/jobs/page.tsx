'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { Avatar, Card, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { JOB_STATUS_LABEL, JOB_TONE } from '@/lib/constants/labels';
import { byId, findArtist, isPendingInvite } from '@/lib/selectors';
import { brandNextStep } from '@/lib/store/actions/brand';
import { useViewer } from '@/lib/store/hooks';
import type { Job } from '@/types';

type Bucket = 'review' | 'progress' | 'done';

const bucketOf = (j: Job): Bucket => (brandNextStep(j) ? 'review' : j.status === 'PAID' || j.status === 'CANCELLED' || j.status === 'CONFIRMED' ? 'done' : 'progress');

export default function JobApprovalPage() {
  const { world, business } = useViewer();
  const [tab, setTab] = useState<Bucket>('review');
  const campaignIds = new Set(world.campaigns.filter((c) => c.brandId === business!.id).map((c) => c.id));
  const jobs = world.jobs.filter((j) => campaignIds.has(j.campaignId));
  const list = jobs.filter((j) => bucketOf(j) === tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Job approval" subtitle="Review drafts, confirm posts and release payment to creators." />
      <Tabs value={tab} onChange={setTab} tabs={(['review', 'progress', 'done'] as const).map((b) => ({ value: b, label: { review: 'Needs you', progress: 'With creators', done: 'Done' }[b], count: jobs.filter((j) => bucketOf(j) === b).length }))} />
      {list.length === 0 ? (
        <EmptyState icon={<CheckSquare className="size-8" />} title={tab === 'review' ? 'Nothing to review' : 'Nothing here'} body={tab === 'review' ? 'Drafts and posts waiting for your approval show up here.' : 'Hire creators from a campaign to see jobs here.'} />
      ) : (
        <Card padded={false}>
          <div className="flex flex-col gap-1">
            {list.map((j) => {
              const a = findArtist(world, j.artistId);
              const c = byId(world.campaigns, j.campaignId);
              const next = brandNextStep(j);
              return (
                <Link key={j.id} href={`/biz/jobs/${j.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2/50">
                  <Avatar name={a?.stageName ?? 'Creator'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{a?.stageName} · {c?.title}</div>
                    <div className="truncate text-xs text-muted">{next ?? (isPendingInvite(j) ? 'Invite pending' : j.jobType === 'INFLUENCE' ? 'Influence' : 'Insights')}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Money amount={j.fee} className="text-sm font-semibold text-text" />
                    <StatusPill status={j.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[j.status]} />
                  </div>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
