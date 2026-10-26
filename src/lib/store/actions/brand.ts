'use client';

import type { PaymentMethod } from '@/lib/constants/enums';
import { newId, nowISO } from '@/lib/format';
import { artistOwner, artists, businessRef, byId, currentPolicy, findArtist, jobContract, personRef } from '@/lib/selectors';
import type { ArtistId, BusinessId, CampaignId, CreatorCampaign, Job, JobId, Minor, ProposalId, World } from '@/types';
import type { AppState } from '../store';
import { commit, later } from '../store';
import { openJobContract } from './creator';
import { fundEscrow, markFulfilled, openEscrow, releaseEscrow } from './money';
import { DELAY, notify } from './util';

// COMMISSION_CREATOR_JOBS, the brand's side of 7.3. Here the creator is simulated; creator.ts has the creator's side.

export type CampaignInput = Pick<CreatorCampaign, 'title' | 'brief' | 'jobType' | 'tiers' | 'feePerCreator' | 'slots' | 'deadline' | 'deliverables'>;

export function saveCampaign(brandId: BusinessId, input: CampaignInput, publish: boolean, id?: CampaignId): CampaignId {
  const campaignId = id ?? newId('cmp');
  const budget = (input.feePerCreator * input.slots) as Minor;
  let opened = false;
  commit((s) => {
    const existing = byId(s.world.campaigns, campaignId);
    const status = publish ? 'OPEN' : (existing?.status ?? 'DRAFT');
    opened = publish && existing?.status !== 'OPEN';
    if (existing) Object.assign(existing, input, { budget, status });
    else s.world.campaigns.unshift({ id: campaignId, brandId, ...input, budget, status, createdAt: nowISO() });
  });
  if (opened) simulateIncomingProposals(campaignId);
  return campaignId;
}

export function setCampaignStatus(id: CampaignId, status: Extract<CreatorCampaign['status'], 'OPEN' | 'CLOSED' | 'CANCELLED'>) {
  commit((s) => {
    const c = byId(s.world.campaigns, id);
    if (c) c.status = status;
  });
  if (status === 'OPEN') simulateIncomingProposals(id);
}

/** The tester never plays the simulated creator, even if they're a creator themselves. */
const isTester = (s: AppState, w: World, artistId: ArtistId) => findArtist(w, artistId)?.personId === s.session?.personId;

/** A published campaign attracts pitches from eligible creators over the next few seconds. */
function simulateIncomingProposals(campaignId: CampaignId) {
  [1, 2].forEach((n) =>
    later(DELAY.counterparty * n, (s) => {
      const w = s.world;
      const c = byId(w.campaigns, campaignId);
      if (!c || c.status !== 'OPEN') return;
      const taken = new Set([...w.proposals.filter((p) => p.campaignId === c.id).map((p) => p.artistId), ...w.jobs.filter((j) => j.campaignId === c.id).map((j) => j.artistId)]);
      const creator = artists(w).find((a) => a.creator && c.tiers.includes(a.creator.tier) && !taken.has(a.id) && !isTester(s, w, a.id));
      if (!creator) return;
      const pitches = ['Natural, behind-the-scenes take that fits my feed.', 'A quick-cut night-out reel with your product front and centre.'];
      // The second pitch asks for a bit more than the posted fee, so the brand has something to weigh up.
      const price = (n === 2 ? Math.round((c.feePerCreator * 1.2) / 100) * 100 : c.feePerCreator) as Minor;
      w.proposals.unshift({ id: newId('prp'), campaignId: c.id, artistId: creator.id, pitch: pitches[n - 1], price, status: 'SUBMITTED', createdAt: nowISO() });
      notify(w, businessRef(c.brandId), 'DRAFT_SUBMITTED', 'New creator proposal', `${creator.stageName} pitched “${c.title}”.`, `/biz/campaigns/${c.id}`);
    }),
  );
}

// ---------- Proposals ----------
export function shortlistProposal(id: ProposalId) {
  commit((s) => {
    const w = s.world;
    const p = byId(w.proposals, id);
    if (p?.status !== 'SUBMITTED') return;
    p.status = 'SHORTLISTED';
    const c = byId(w.campaigns, p.campaignId)!;
    notify(w, personRef(findArtist(w, p.artistId)!.personId), 'JOB_ASSIGNED', 'You’re shortlisted', `${byId(w.businesses, c.brandId)?.name} shortlisted your proposal for “${c.title}”.`, '/creator/inbox?tab=proposals');
  });
}

export function rejectProposal(id: ProposalId) {
  commit((s) => {
    const w = s.world;
    const p = byId(w.proposals, id);
    if (!p || (p.status !== 'SUBMITTED' && p.status !== 'SHORTLISTED')) return;
    p.status = 'REJECTED';
    const c = byId(w.campaigns, p.campaignId)!;
    notify(w, personRef(findArtist(w, p.artistId)!.personId), 'JOB_ASSIGNED', 'Proposal not selected', `${byId(w.businesses, c.brandId)?.name} went with other creators for “${c.title}”.`, '/creator/inbox?tab=proposals');
  });
}

/** Opens a funded job: escrow from the brand, agreement signed by the brand. */
function openJob(w: World, c: CreatorCampaign, artistId: ArtistId, fee: Minor, source: Job['source'], method: PaymentMethod): Job {
  const jobId = newId('job');
  const creator = personRef(findArtist(w, artistId)!.personId);
  const escrowId = openEscrow(w, { subject: { kind: 'JOB', id: jobId }, payer: businessRef(c.brandId), payee: creator, amount: fee, trigger: 'JOB_CONFIRMED', funded: false, feeBps: currentPolicy(w).creatorJobFeeBps });
  const base = { id: jobId, campaignId: c.id, artistId, source, fee, escrowId, drafts: [], inviteAccepted: source === 'OPEN_PROPOSAL' };
  const job: Job = c.jobType === 'INFLUENCE' ? { ...base, jobType: 'INFLUENCE', status: 'ASSIGNED' } : { ...base, jobType: 'INSIGHTS', status: 'ASSIGNED' };
  w.jobs.unshift(job);
  fundEscrow(w, escrowId, method, `Creator job: ${c.title}`);
  const filled = w.jobs.filter((j) => j.campaignId === c.id && j.status !== 'CANCELLED').length >= c.slots;
  if (filled && c.status === 'OPEN') c.status = 'FILLED';
  return job;
}

export function acceptProposal(id: ProposalId, method: PaymentMethod): JobId | undefined {
  let jobId: JobId | undefined;
  commit((s) => {
    const w = s.world;
    const p = byId(w.proposals, id);
    const c = p && byId(w.campaigns, p.campaignId);
    if (!p || !c || (p.status !== 'SUBMITTED' && p.status !== 'SHORTLISTED')) return;
    p.status = 'ACCEPTED';
    const job = openJob(w, c, p.artistId, p.price, 'OPEN_PROPOSAL', method);
    openJobContract(w, job);
    jobId = job.id;
    notify(w, personRef(findArtist(w, p.artistId)!.personId), 'JOB_ASSIGNED', `${byId(w.businesses, c.brandId)?.name} accepted your proposal`, `“${c.title}” is now an active job. Sign the agreement to start.`, `/creator/jobs/${job.id}`);
  });
  if (jobId) creatorStarts(jobId);
  return jobId;
}

export function inviteCreator(campaignId: CampaignId, artistId: ArtistId, fee: Minor, method: PaymentMethod): JobId | undefined {
  let jobId: JobId | undefined;
  commit((s) => {
    const w = s.world;
    const c = byId(w.campaigns, campaignId);
    if (!c) return;
    const job = openJob(w, c, artistId, fee, 'DIRECT_INVITE', method);
    jobId = job.id;
    notify(w, personRef(findArtist(w, artistId)!.personId), 'JOB_ASSIGNED', 'You’re invited!', `${byId(w.businesses, c.brandId)?.name} invited you to “${c.title}”.`, '/creator/inbox');
  });
  if (!jobId) return undefined;
  const id = jobId;
  // Simulated creator accepts the invite, then starts work.
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, id);
    if (!j || j.inviteAccepted || j.status !== 'ASSIGNED' || isTester(s, w, j.artistId)) return;
    j.inviteAccepted = true;
    openJobContract(w, j);
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, businessRef(c.brandId), 'JOB_ASSIGNED', 'Invite accepted', `${findArtist(w, j.artistId)?.stageName} accepted your invite to “${c.title}”.`, `/biz/jobs/${j.id}`);
  });
  creatorStarts(id, DELAY.counterparty);
  return id;
}

// ---------- The simulated creator ----------
const DRAFT_NOTES = ['First cut attached: 28s reel, licensed audio, product in the opening shot.', 'Revised cut: logo in the first 3 seconds and brand tagged in the caption.'];
const SURVEY_ANSWERS = ['Tastes fresh, not too sweet', 'Would buy it at KES 150', 'Best served ice cold at a night out', 'Packaging stands out on the shelf'];

/** Signs the agreement, then submits the first draft (or insights). */
function creatorStarts(jobId: JobId, after = 0) {
  later(after + DELAY.quick, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    const con = jobContract(w, jobId);
    if (!j || !con || !j.inviteAccepted || isTester(s, w, j.artistId)) return;
    const me = personRef(findArtist(w, j.artistId)!.personId);
    if (!con.signedBy.some((p) => p.kind === me.kind && p.id === me.id)) con.signedBy.push(me);
    con.status = 'ACTIVE';
  });
  later(after + DELAY.counterparty * 2, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'ASSIGNED' || !j.inviteAccepted || isTester(s, w, j.artistId)) return;
    submitAsCreator(w, j);
  });
}

function submitAsCreator(w: World, j: Job) {
  j.drafts.push({ submittedAt: nowISO(), note: j.jobType === 'INSIGHTS' ? 'Survey complete, plus a product photo.' : DRAFT_NOTES[Math.min(j.drafts.length, 1)] });
  if (j.jobType === 'INSIGHTS') j.surveyAnswers = SURVEY_ANSWERS;
  j.status = 'DRAFT_SUBMITTED';
  const c = byId(w.campaigns, j.campaignId)!;
  notify(w, businessRef(c.brandId), 'DRAFT_SUBMITTED', 'Draft ready for review', `${findArtist(w, j.artistId)?.stageName} submitted ${j.jobType === 'INSIGHTS' ? 'insights' : 'a draft'} for “${c.title}”.`, `/biz/jobs/${j.id}`);
}

// ---------- Job approval ----------
/** What the brand has to do next, if anything. */
export function brandNextStep(j: Job): string | null {
  if (j.status === 'DRAFT_SUBMITTED') return j.jobType === 'INSIGHTS' ? 'Review insights' : 'Review draft';
  if (j.status === 'POSTED') return 'Confirm the live post';
  if (j.jobType === 'INSIGHTS' && j.status === 'APPROVED') return 'Confirm and pay';
  return null;
}

const creatorOf = (w: World, j: Job) => personRef(artistOwner(w, findArtist(w, j.artistId)!).id);

export function requestRevision(jobId: JobId, feedback: string) {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'DRAFT_SUBMITTED') return;
    j.status = 'REVISION_REQUESTED';
    j.drafts.at(-1)!.feedback = feedback;
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, creatorOf(w, j), 'DRAFT_SUBMITTED', 'Revision requested', `${byId(w.businesses, c.brandId)?.name} left feedback on your draft for “${c.title}”.`, `/creator/jobs/${j.id}`);
  });
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (j?.status === 'REVISION_REQUESTED' && !isTester(s, w, j.artistId)) submitAsCreator(w, j);
  });
}

/** Approve the draft. Influence jobs then go live (the creator posts); insights jobs are ready to confirm. */
export function approveDraft(jobId: JobId, feedback = 'Approved. Go ahead and post at the scheduled time.') {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'DRAFT_SUBMITTED') return;
    j.status = 'APPROVED';
    j.drafts.at(-1)!.feedback = feedback;
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, creatorOf(w, j), 'DRAFT_SUBMITTED', 'Draft approved', j.jobType === 'INFLUENCE' ? `Schedule and post your content for “${c.title}”.` : `Your insights for “${c.title}” were approved.`, `/creator/jobs/${j.id}`);
  });
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.jobType !== 'INFLUENCE' || j.status !== 'APPROVED' || isTester(s, w, j.artistId)) return;
    j.status = 'POSTED';
    j.postedUrl = `https://instagram.com/p/${j.id.slice(4)}`;
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, businessRef(c.brandId), 'DRAFT_SUBMITTED', 'Creator posted', `${findArtist(w, j.artistId)?.stageName} posted for “${c.title}”. Confirm to release payment.`, `/biz/jobs/${j.id}`);
  });
}

/** Confirm the live post (or the insights): escrow is fulfilled, then released after the compressed hold. */
export function confirmJob(jobId: JobId) {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || (j.jobType === 'INFLUENCE' ? j.status !== 'POSTED' : j.status !== 'APPROVED')) return;
    j.status = 'CONFIRMED';
    markFulfilled(w, j.escrowId);
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, creatorOf(w, j), 'JOB_CONFIRMED', 'Work confirmed', `${byId(w.businesses, c.brandId)?.name} confirmed “${c.title}”. Payment is releasing.`, `/creator/jobs/${j.id}`);
  });
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'CONFIRMED') return;
    j.status = 'PAID';
    releaseEscrow(w, j.escrowId, byId(w.campaigns, j.campaignId)!.title);
    const con = jobContract(w, jobId);
    if (con) con.status = 'COMPLETED';
  });
}
