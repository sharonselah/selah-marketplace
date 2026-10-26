'use client';

import { useState } from 'react';
import { JobRow } from '@/components/shared/Creator';
import { LinkButton } from '@/components/ui/Button';
import { Card, EmptyState, PageHeader } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { isPendingInvite, jobAwaitsCreator, jobNeedsSignature } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { Job, World } from '@/types';

type Tab = 'active' | 'done';

function nextStep(w: World, j: Job): string | undefined {
  if (jobNeedsSignature(w, j.id)) return 'Sign agreement';
  if (!jobAwaitsCreator(w, j)) return j.status === 'DRAFT_SUBMITTED' || j.status === 'POSTED' || j.status === 'CONFIRMED' ? 'Waiting on brand' : undefined;
  if (j.status === 'REVISION_REQUESTED') return 'Revise draft';
  if (j.status === 'APPROVED') return 'Post content';
  return j.jobType === 'INSIGHTS' ? 'Submit insights' : 'Submit draft';
}

export default function ActiveJobsPage() {
  const { world, me } = useViewer();
  const [tab, setTab] = useState<Tab>('active');
  const jobs = world.jobs.filter((j) => j.artistId === me.artist!.id && !isPendingInvite(j));
  const active = jobs.filter((j) => j.status !== 'PAID' && j.status !== 'CANCELLED');
  const done = jobs.filter((j) => j.status === 'PAID' || j.status === 'CANCELLED');
  // Jobs waiting on you first.
  active.sort((a, b) => Number(jobAwaitsCreator(world, b)) - Number(jobAwaitsCreator(world, a)));
  const list = tab === 'active' ? active : done;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Active jobs" subtitle="Drafts, revisions, posting and payment for every brand job." action={<LinkButton href="/creator/inbox" variant="outline">Job inbox</LinkButton>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'In progress', count: active.length }, { value: 'done', label: 'Completed', count: done.length }]} />
      {list.length === 0 ? (
        <EmptyState title={tab === 'active' ? 'No jobs in progress' : 'No completed jobs yet'} body="Accept an invite or get a proposal accepted to start a job." action={<LinkButton href="/creator/inbox?tab=open">Find work</LinkButton>} />
      ) : (
        <Card>
          <div className="flex flex-col gap-1">
            {list.map((j) => <JobRow key={j.id} world={world} job={j} hint={nextStep(world, j)} />)}
          </div>
        </Card>
      )}
    </div>
  );
}
