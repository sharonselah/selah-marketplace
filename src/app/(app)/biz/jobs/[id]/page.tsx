'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CheckCircle2, ExternalLink, Loader2, MessageSquareWarning, ThumbsUp } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { ContractCard } from '@/components/shared/Contract';
import { TierBadge } from '@/components/shared/Creator';
import { EscrowPanel } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { Timeline } from '@/components/ui/Visuals';
import { JOB_FLOW, type JobStatus } from '@/lib/constants/enums';
import { JOB_SOURCE_LABEL, JOB_STATUS_LABEL, JOB_TONE } from '@/lib/constants/labels';
import { formatCount, formatDate, formatDateTime } from '@/lib/format';
import { byId, findArtist, isPendingInvite, jobContract, personRef } from '@/lib/selectors';
import { approveDraft, confirmJob, requestRevision } from '@/lib/store/actions/brand';
import { useViewer } from '@/lib/store/hooks';
import type { JobId } from '@/types';

const TRACK_POSITION: Partial<Record<JobStatus, JobStatus>> = { REVISION_REQUESTED: 'DRAFT_SUBMITTED' };

function Waiting({ children }: { children: ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      <Loader2 className="size-6 shrink-0 animate-spin text-brand" />
      <div className="text-sm text-text">{children}</div>
    </Card>
  );
}

export default function BrandJobPage() {
  const { id } = useParams<{ id: JobId }>();
  const { world, actingAs, business } = useViewer();
  const [feedback, setFeedback] = useState('');
  const [revising, setRevising] = useState(false);
  const job = byId(world.jobs, id);
  const campaign = job && byId(world.campaigns, job.campaignId);
  if (!job || campaign?.brandId !== business!.id) return <EmptyState title="Job not found" action={<BackLink href="/biz/jobs" label="Job approval" />} />;

  const artist = findArtist(world, job.artistId)!;
  const creator = personRef(artist.personId);
  const contract = jobContract(world, job.id);
  const escrow = byId(world.escrows, job.escrowId);
  const offPath = job.status === 'CANCELLED' || job.status === 'DISPUTED';
  const latest = job.drafts.at(-1);
  const kind = job.jobType === 'INSIGHTS' ? 'insights' : 'draft';

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={<BackLink href="/biz/jobs" label="Job approval" />}
        title={`${artist.stageName} · ${campaign.title}`}
        subtitle={`${job.jobType === 'INFLUENCE' ? 'Influence job' : 'Insights job'} · ${JOB_SOURCE_LABEL[job.source]}`}
        action={<StatusPill status={job.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[job.status]} />}
      />
      <Card className="mb-6">
        <Timeline steps={JOB_FLOW[job.jobType]} current={offPath ? 'ASSIGNED' : (TRACK_POSITION[job.status] ?? job.status)} failed={offPath ? job.status : undefined} labels={JOB_STATUS_LABEL} />
      </Card>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          {isPendingInvite(job) && <Waiting>Invite sent. Waiting for {artist.stageName} to accept. Your escrow is refunded if they decline.</Waiting>}
          {!isPendingInvite(job) && job.status === 'ASSIGNED' && <Waiting>{contract?.status === 'SENT' ? `Waiting for ${artist.stageName} to sign the agreement…` : `${artist.stageName} is working on the ${kind}…`}</Waiting>}
          {job.status === 'REVISION_REQUESTED' && <Waiting>Feedback sent. {artist.stageName} is revising the draft…</Waiting>}
          {job.jobType === 'INFLUENCE' && job.status === 'APPROVED' && <Waiting>Approved. Waiting for {artist.stageName} to post{job.scheduledFor ? ` (scheduled ${formatDateTime(job.scheduledFor)})` : ''}…</Waiting>}

          {job.status === 'DRAFT_SUBMITTED' && latest && (
            <Card tone="brand">
              <CardHeader title={`Review ${kind} v${job.drafts.length}`} subtitle={`Submitted ${formatDateTime(latest.submittedAt)}`} />
              <p className="text-sm text-text">{latest.note}</p>
              {job.jobType === 'INSIGHTS' && job.surveyAnswers && (
                <ul className="mt-3 flex flex-col gap-1 text-sm text-text">
                  {job.surveyAnswers.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              )}
              {revising ? (
                <div className="mt-4 flex flex-col gap-3">
                  <Field label="What should change?">
                    <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Show the can in the first 3 seconds and tag @kileledrinks" autoFocus />
                  </Field>
                  <div className="flex gap-2">
                    <Button disabled={feedback.trim().length < 5} onClick={() => { requestRevision(job.id, feedback.trim()); setRevising(false); setFeedback(''); toast('Revision requested'); }}>Send feedback</Button>
                    <Button variant="ghost" onClick={() => setRevising(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button icon={<ThumbsUp className="size-4" />} onClick={() => { approveDraft(job.id, job.jobType === 'INSIGHTS' ? 'Thanks, really useful feedback.' : undefined); toast(job.jobType === 'INSIGHTS' ? 'Approved. Confirm to release payment.' : 'Approved. The creator will post next.'); }}>Approve</Button>
                  <Button variant="outline" icon={<MessageSquareWarning className="size-4" />} onClick={() => setRevising(true)}>Request revision</Button>
                </div>
              )}
            </Card>
          )}

          {(job.status === 'POSTED' || (job.jobType === 'INSIGHTS' && job.status === 'APPROVED')) && (
            <Card tone="brand">
              <div className="font-semibold text-text">{job.status === 'POSTED' ? `${artist.stageName} posted` : 'Insights approved'}</div>
              {job.jobType === 'INFLUENCE' && job.postedUrl && (
                <a href={job.postedUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline">
                  View live post <ExternalLink className="size-3.5" />
                </a>
              )}
              <p className="mt-1 text-sm text-muted">Confirming releases {artist.stageName}’s fee from escrow after the hold period.</p>
              <Button className="mt-4" icon={<CheckCircle2 className="size-4" />} onClick={() => { confirmJob(job.id); toast('Confirmed. Payment is releasing.'); }}>
                Confirm & release payment
              </Button>
            </Card>
          )}
          {job.status === 'CONFIRMED' && <Waiting>Confirmed. Releasing payment to {artist.stageName} after the hold period…</Waiting>}
          {job.status === 'PAID' && (
            <Card>
              <div className="font-semibold text-good">Done. {artist.stageName} has been paid.</div>
              {job.jobType === 'INFLUENCE' && job.postedUrl && <a href={job.postedUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline">View post <ExternalLink className="size-3.5" /></a>}
            </Card>
          )}
          {job.status === 'CANCELLED' && <Card><div className="font-semibold text-text">Cancelled</div><p className="mt-1 text-sm text-muted">{artist.stageName} declined. Your escrow was refunded.</p></Card>}

          {job.drafts.length > 0 && (
            <Card>
              <CardHeader title={job.jobType === 'INFLUENCE' ? 'Draft history' : 'Submissions'} />
              <ol className="flex flex-col gap-1">
                {job.drafts.map((d, i) => (
                  <li key={d.submittedAt} className="py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex justify-between text-xs text-muted"><span>Version {i + 1}</span><span>{formatDateTime(d.submittedAt)}</span></div>
                    <div className="mt-1 text-text">{d.note}</div>
                    {d.feedback && <div className="mt-1 text-muted"><span className="font-medium">You:</span> {d.feedback}</div>}
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {contract && <ContractCard world={world} contract={contract} parties={[actingAs, creator]} me={actingAs} onSign={() => {}} />}
          {escrow && <EscrowPanel escrow={escrow} showSplits me={actingAs} title="Creator payment" />}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={artist.stageName} size="lg" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-text">{artist.stageName}</div>
                {artist.creator && <div className="text-xs text-muted">{formatCount(artist.creator.followerCount)} followers</div>}
                {artist.creator && <TierBadge tier={artist.creator.tier} />}
              </div>
            </div>
            <div className="mt-4">
              <DefinitionList items={[['Fee', <Money key="f" amount={job.fee} />], ['Deadline', formatDate(campaign.deadline)], ['Deliverables', campaign.deliverables.length]]} />
            </div>
            <Link href={`/biz/campaigns/${campaign.id}`} className="mt-3 inline-block text-sm text-brand hover:underline">Campaign →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
