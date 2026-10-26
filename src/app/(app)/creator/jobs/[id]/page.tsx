'use client';

import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CalendarClock, CheckCircle2, ExternalLink, Loader2, MessageSquareWarning, Send, Upload } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { ContractCard } from '@/components/shared/Contract';
import { CampaignBrief } from '@/components/shared/Creator';
import { EscrowPanel, SplitBreakdown } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { FileDrop } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { Timeline } from '@/components/ui/Visuals';
import { cn } from '@/lib/cn';
import { JOB_FLOW, type JobStatus } from '@/lib/constants/enums';
import { JOB_SOURCE_LABEL, JOB_STATUS_LABEL, JOB_TONE } from '@/lib/constants/labels';
import { formatDate, formatDateTime, timeAgo } from '@/lib/format';
import { byId, isPendingInvite, jobContract, partyName, personRef } from '@/lib/selectors';
import { markPosted, respondToInvite, schedulePost, signJobContract, submitDraft, submitInsights } from '@/lib/store/actions/creator';
import { useViewer } from '@/lib/store/hooks';
import type { Job, JobId } from '@/types';

/** Where an off-path status sits on the happy-path track. */
const TRACK_POSITION: Partial<Record<JobStatus, JobStatus>> = { REVISION_REQUESTED: 'DRAFT_SUBMITTED' };

export default function CreatorJobPage() {
  const { id } = useParams<{ id: JobId }>();
  const { world, me } = useViewer();
  const artist = me.artist!;
  const job = byId(world.jobs, id);
  if (!job || job.artistId !== artist.id) return <EmptyState title="Job not found" action={<BackLink href="/creator/jobs" />} />;

  const campaign = byId(world.campaigns, job.campaignId)!;
  const brand = { kind: 'BUSINESS', id: campaign.brandId } as const;
  const brandName = partyName(world, brand);
  const contract = jobContract(world, job.id);
  const escrow = byId(world.escrows, job.escrowId);
  const myRef = personRef(me.id);
  const invite = isPendingInvite(job);
  const unsigned = contract?.status === 'SENT';
  const steps: readonly JobStatus[] = JOB_FLOW[job.jobType];
  const offPath = job.status === 'CANCELLED' || job.status === 'DISPUTED';
  const lastFeedback = job.drafts.at(-1)?.feedback;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={<BackLink href="/creator/jobs" label="Active jobs" />}
        title={campaign.title}
        subtitle={`${brandName} · ${job.jobType === 'INFLUENCE' ? 'Influence job' : 'Insights job'} · ${JOB_SOURCE_LABEL[job.source]}`}
        action={<StatusPill status={job.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[job.status]} />}
      />

      <div className="mb-6">
        <Timeline steps={steps} current={offPath ? 'ASSIGNED' : (TRACK_POSITION[job.status] ?? job.status)} failed={offPath ? job.status : undefined} labels={JOB_STATUS_LABEL} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          {invite ? (
            <Card tone="brand">
              <div className="font-semibold text-text">{brandName} invited you to this job</div>
              <p className="mt-1 text-sm text-muted">The fee is already held in escrow. Accept to receive the agreement.</p>
              {escrow && <SplitBreakdown className="mt-3" total={escrow.amount} splits={escrow.splits} me={myRef} />}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { respondToInvite(job.id, true); toast('Invite accepted. Sign the agreement to start.'); }}>Accept invite</Button>
                <Button variant="ghost" onClick={() => { respondToInvite(job.id, false); toast('Invite declined', 'info'); }}>Decline</Button>
              </div>
            </Card>
          ) : unsigned ? (
            <Card tone="brand">
              <div className="font-semibold text-text">Sign the agreement to start</div>
              <p className="mt-1 text-sm text-muted">{brandName} has signed. Once you sign, you can submit your {job.jobType === 'INFLUENCE' ? 'draft' : 'insights'}.</p>
            </Card>
          ) : (
            <JobAction job={job} brandName={brandName} feedback={lastFeedback} />
          )}

          {contract && <ContractCard world={world} contract={contract} parties={[brand, myRef]} me={myRef} onSign={() => { signJobContract(job.id); toast('Agreement signed. You can start now.'); }} />}

          {job.drafts.length > 0 && (
            <Card>
              <CardHeader title={job.jobType === 'INFLUENCE' ? 'Drafts' : 'Submissions'} />
              <ol className="flex flex-col gap-1">
                {job.drafts.map((d, i) => (
                  <li key={d.submittedAt} className="py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Version {i + 1}</span>
                      <span>{formatDateTime(d.submittedAt)}</span>
                    </div>
                    <div className="mt-1 text-text">{d.note}</div>
                    {d.feedback && (
                      <p className={cn('mt-2', i === job.drafts.length - 1 && job.status === 'REVISION_REQUESTED' ? 'text-warn' : 'text-muted')}>
                        <span className="font-medium">{brandName}:</span> {d.feedback}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {job.jobType === 'INSIGHTS' && job.surveyAnswers && (
                <div className="mt-4 border-t border-border pt-4">
                  <DefinitionList items={INSIGHT_QUESTIONS.map((q, i) => [q.label, job.surveyAnswers?.[i] || '-'])} />
                </div>
              )}
            </Card>
          )}

          {escrow && !invite && <EscrowPanel escrow={escrow} showSplits me={myRef} title="Your payment" />}
        </div>

        <Card className="h-fit">
          <CampaignBrief world={world} campaign={campaign} />
          <div className="mt-5 border-t border-border pt-5">
            <DefinitionList
              items={[
                ['Your fee', <Money key="f" amount={job.fee} />],
                ['Deadline', formatDate(campaign.deadline)],
                ...(job.jobType === 'INFLUENCE' && job.scheduledFor ? ([['Scheduled post', formatDateTime(job.scheduledFor)]] as [string, string][]) : []),
                ...(job.jobType === 'INFLUENCE' && job.postedUrl ? ([['Live post', job.postedUrl.startsWith('screenshot:') ? 'Screenshot uploaded' : <a key="u" href={job.postedUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open link</a>]] as [string, ReactNode][]) : []),
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

const INSIGHT_QUESTIONS = [
  { label: 'First impression', kind: 'text' },
  { label: 'Quality / taste (1–5)', kind: 'rating' },
  { label: 'Who is it for?', kind: 'text' },
  { label: 'Would you recommend it? Why?', kind: 'text' },
  { label: 'What would you change?', kind: 'text' },
] as const;

function Waiting({ children }: { children: ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      <Loader2 className="size-6 shrink-0 animate-spin text-brand" />
      <div className="text-sm text-text">{children}</div>
    </Card>
  );
}

/** The single next step for the creator, by status and job type. */
function JobAction({ job, brandName, feedback }: { job: Job; brandName: string; feedback?: string }) {
  switch (job.status) {
    case 'ASSIGNED':
    case 'REVISION_REQUESTED':
      return job.jobType === 'INFLUENCE' ? <DraftForm job={job} feedback={job.status === 'REVISION_REQUESTED' ? feedback : undefined} /> : <InsightsForm job={job} />;
    case 'DRAFT_SUBMITTED':
      return <Waiting>Submitted. {brandName} is reviewing your {job.jobType === 'INFLUENCE' ? 'draft' : 'insights'}…</Waiting>;
    case 'APPROVED':
      return job.jobType === 'INFLUENCE' ? <PostForm job={job} /> : <Waiting>Approved! {brandName} is confirming your submission…</Waiting>;
    case 'POSTED':
      return <Waiting>Posted. Waiting for {brandName} to confirm the live post…</Waiting>;
    case 'CONFIRMED':
      return <Waiting>{brandName} confirmed your work. Releasing payment after the hold period…</Waiting>;
    case 'PAID':
      return (
        <Card tone="good">
          <div className="flex items-center gap-2 font-semibold text-good"><CheckCircle2 className="size-5" /> Paid. Your share is in your wallet.</div>
        </Card>
      );
    case 'DISPUTED':
      return <Card><div className="text-sm text-bad">This job is under dispute. Funds are frozen while Selah reviews it.</div></Card>;
    case 'CANCELLED':
      return <Card><div className="text-sm text-muted">This job was cancelled. Any escrow was returned to the brand.</div></Card>;
  }
}

function DraftForm({ job, feedback }: { job: Job; feedback?: string }) {
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const revision = job.status === 'REVISION_REQUESTED';
  return (
    <Card>
      <CardHeader title={revision ? 'Upload your revised draft' : 'Submit your draft'} subtitle="The brand approves drafts before anything goes live." />
      {feedback && (
        <p className="mb-4 flex items-start gap-2 text-sm text-warn">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" /> {feedback}
        </p>
      )}
      <div className="flex flex-col gap-4">
        <FileDrop label="Upload draft video or photos" hint="MP4, MOV, JPG (prototype: files aren’t really uploaded)" files={files} onChange={setFiles} multiple />
        <Field label="Notes for the brand" hint="Caption, music, anything they should know.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={revision ? 'Moved the product to the opening shot and tagged the brand…' : 'Draft reel, 30s, licensed track…'} />
        </Field>
        <Button
          className="self-start"
          icon={<Send className="size-4" />}
          disabled={!files.length || note.trim().length < 5}
          onClick={() => {
            submitDraft(job.id, `${note.trim()} · ${files.join(', ')}`);
            toast(revision ? 'Revised draft sent' : 'Draft sent for review');
          }}
        >
          {revision ? 'Resubmit draft' : 'Submit draft'}
        </Button>
      </div>
    </Card>
  );
}

function InsightsForm({ job }: { job: Job }) {
  const [answers, setAnswers] = useState<string[]>(() => INSIGHT_QUESTIONS.map(() => ''));
  const [photo, setPhoto] = useState<string[]>([]);
  const set = (i: number, v: string) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
  const complete = answers.every((a) => a.trim());
  return (
    <Card>
      <CardHeader title="Share your insights" subtitle="No posting needed. The brand pays once it confirms your answers." />
      <div className="flex flex-col gap-4">
        {INSIGHT_QUESTIONS.map((q, i) =>
          q.kind === 'rating' ? (
            <Field key={q.label} label={q.label}>
              <div className="flex gap-2">
                {['1', '2', '3', '4', '5'].map((n) => (
                  <button key={n} type="button" onClick={() => set(i, n)} className={cn('size-10 rounded-full text-sm font-semibold', answers[i] === n ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text hover:bg-brand-soft')}>
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field key={q.label} label={q.label}>
              <Input value={answers[i]} onChange={(e) => set(i, e.target.value)} />
            </Field>
          ),
        )}
        <FileDrop label="Photo of you with the product (optional)" files={photo} onChange={setPhoto} accept="image/*" />
        <Button
          className="self-start"
          icon={<Send className="size-4" />}
          disabled={!complete}
          onClick={() => {
            submitInsights(job.id, answers.map((a) => a.trim()), photo.length ? `Survey + photo (${photo[0]})` : 'Survey answers');
            toast('Insights submitted');
          }}
        >
          Submit insights
        </Button>
      </div>
    </Card>
  );
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function PostForm({ job }: { job: Job }) {
  const scheduled = job.jobType === 'INFLUENCE' ? job.scheduledFor : undefined;
  const [when, setWhen] = useState(() => {
    const tomorrowEvening = new Date(Date.now() + 86400_000);
    tomorrowEvening.setHours(19, 0, 0, 0);
    return toLocalInput(scheduled ?? tomorrowEvening.toISOString());
  });
  const [url, setUrl] = useState('');
  const [shot, setShot] = useState<string[]>([]);
  const validUrl = /^https?:\/\/\S+\.\S+/.test(url.trim());
  return (
    <Card>
      <CardHeader title="Approved: time to post" subtitle="Post at your scheduled time, then share the link so the brand can confirm." />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Scheduled for" className="flex-1">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Button
            variant="outline"
            icon={<CalendarClock className="size-4" />}
            disabled={!when}
            onClick={() => {
              schedulePost(job.id, new Date(when).toISOString());
              toast(`Scheduled for ${formatDateTime(new Date(when).toISOString())}`);
            }}
          >
            {scheduled ? 'Update schedule' : 'Save schedule'}
          </Button>
        </div>
        {scheduled && <p className="-mt-3 text-xs text-muted">Scheduled {timeAgo(scheduled)}. We’ll remind you an hour before.</p>}
        <div className="border-t border-border pt-4">
          <div className="mb-3 text-sm font-medium text-text">Mark as posted</div>
          <div className="flex flex-col gap-3">
            <Field label="Link to the live post">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/p/…" />
            </Field>
            <FileDrop label="Or upload a screenshot" files={shot} onChange={setShot} accept="image/*" />
            <Button
              className="self-start"
              icon={url ? <ExternalLink className="size-4" /> : <Upload className="size-4" />}
              disabled={!validUrl && !shot.length}
              onClick={() => {
                markPosted(job.id, validUrl ? url.trim() : `screenshot:${shot[0]}`);
                toast('Marked as posted. Waiting for brand confirmation.');
              }}
            >
              Mark as posted
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
