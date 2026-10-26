'use client';

import { formatKES, newId, nowISO } from '@/lib/format';
import { byId, currentPolicy, findArtist, jobContract, personRef, tierFor } from '@/lib/selectors';
import { CREATOR_TIER } from '@/lib/constants/enums';
import type { ArtistId, ArtistProfile, CampaignId, CreatorProfile, ISODate, Job, JobId, Minor, PayoutAccount, PersonId, ProposalId, World } from '@/types';
import { commit, later } from '../store';
import { fundEscrow, markFulfilled, openEscrow, refundEscrow, releaseEscrow } from './money';
import { DELAY, notify } from './util';

// Creator jobs (7.3): invite / proposal → ACCEPTED → ASSIGNED → DRAFT_SUBMITTED → (REVISION_REQUESTED)* → APPROVED
//   → POSTED (influence only) → CONFIRMED → PAID. Here the brand is simulated; brand.ts has the brand's side.

export type Social = CreatorProfile['socials'][number];

/**
 * The facade "social API": a deterministic follower count per handle.
 * Kept in the Nano/Micro range so a new tester always qualifies for the seeded open campaigns.
 */
export function simulatedFollowers(platform: Social['platform'], handle: string): number {
  const key = `${platform}:${handle.trim().toLowerCase().replace(/^@/, '')}`;
  const h = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
  return 600 + (h % 14000);
}

function profileFrom(socials: Social[], w: World): Pick<CreatorProfile, 'socials' | 'tier' | 'followerCount' | 'tierLastVerifiedAt'> {
  const followerCount = socials.reduce((a, s) => a + s.followers, 0);
  return { socials, followerCount, tier: tierFor(followerCount, currentPolicy(w)) ?? CREATOR_TIER[0], tierLastVerifiedAt: nowISO() };
}

export interface CreatorSetupInput {
  niche: string[];
  rateCard: CreatorProfile['rateCard'];
  socials: Social[];
  /** Only for people who aren't artists yet (creator-only sellers). */
  newSeller?: { stageName: string; payout: PayoutAccount; idVerified: boolean };
}

/** Turns on SELL_CREATOR_SERVICES and stores the verified creator profile. Creator-only people get a minimal artist profile. */
export function setupCreator(personId: PersonId, input: CreatorSetupInput) {
  commit((s) => {
    const w = s.world;
    const p = byId(w.people, personId);
    if (!p) return;
    const creator: CreatorProfile = { niche: input.niche, rateCard: input.rateCard, ...profileFrom(input.socials, w) };
    if (!p.artist) {
      if (!input.newSeller) return;
      const { stageName, payout, idVerified } = input.newSeller;
      if (idVerified) p.verification = 'ID_VERIFIED';
      const artist: ArtistProfile = {
        id: `art_${personId.slice(4)}` as ArtistId,
        personId,
        stageName,
        capabilities: ['SELL_CREATOR_SERVICES'],
        sellerType: 'INDIVIDUAL',
        category: 'OTHER',
        bio: `${input.niche.join(' · ')} creator.`,
        genres: [],
        languages: ['English', 'Swahili'],
        media: [],
        location: p.location,
        travelRadiusKm: 50,
        pricing: { booking: { kind: 'FIXED', amount: 0 as Minor }, songRequest: 0 as Minor, shoutOut: 0 as Minor },
        payout,
        verification: idVerified ? 'ID_VERIFIED' : 'PHONE_VERIFIED',
        rating: 5,
        gigsPlayed: 0,
        creator,
      };
      p.artist = artist;
    } else {
      if (!p.artist.capabilities.includes('SELL_CREATOR_SERVICES')) p.artist.capabilities.push('SELL_CREATOR_SERVICES');
      p.artist.creator = creator;
    }
    notify(w, personRef(personId), 'VERIFICATION_PASSED', `Creator tier verified: ${creator.tier}`, 'Brands can now invite you, and you can pitch open campaigns.', '/creator/inbox');
  });
}

export function updateCreatorProfile(artistId: ArtistId, patch: Partial<Pick<CreatorProfile, 'niche' | 'rateCard'>>) {
  commit((s) => {
    const c = findArtist(s.world, artistId)?.creator;
    if (c) Object.assign(c, patch);
  });
}

/** Re-pull follower counts (e.g. after linking another account). Existing accounts grow a little since last check. */
export function recheckTier(artistId: ArtistId, socials?: Social[]) {
  commit((s) => {
    const c = findArtist(s.world, artistId)?.creator;
    if (!c) return;
    const days = Math.max(1, Math.round((Date.now() - new Date(c.tierLastVerifiedAt).getTime()) / 86400_000));
    const next = (socials ?? c.socials).map((x) => {
      const old = c.socials.find((o) => o.platform === x.platform && o.handle === x.handle);
      return old ? { ...x, followers: Math.round(old.followers * (1 + Math.min(days, 60) * 0.002)) } : x;
    });
    Object.assign(c, profileFrom(next, s.world));
  });
}

// ---------- Jobs ----------

export function openJobContract(w: World, job: Job) {
  const campaign = byId(w.campaigns, job.campaignId)!;
  const terms = [
    ...campaign.deliverables.map((d) => `Deliverable: ${d}`),
    `Deadline: ${new Date(campaign.deadline).toLocaleDateString('en-KE', { dateStyle: 'medium' })}`,
    `Fee: ${formatKES(job.fee)}, held in Selah escrow from the start of the job`,
    job.jobType === 'INFLUENCE'
      ? 'Drafts are approved by the brand before posting; paid once the brand confirms the live post'
      : 'Paid once the brand confirms your insights submission',
    'Content stays live for at least 30 days. Usage rights for brand reposts: 90 days',
  ];
  w.contracts.unshift({
    id: newId('con'),
    subject: { kind: 'JOB', id: job.id },
    title: `Creator agreement: ${campaign.title}`,
    terms,
    status: 'SENT',
    // The brand signs when inviting or accepting; the creator signs next.
    signedBy: [{ kind: 'BUSINESS', id: campaign.brandId }],
    createdAt: nowISO(),
  });
}

/** Accept or decline a direct invite. Declining refunds the brand's escrow. */
export function respondToInvite(jobId: JobId, accept: boolean) {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.inviteAccepted || j.status !== 'ASSIGNED') return;
    const campaign = byId(w.campaigns, j.campaignId)!;
    const brand = { kind: 'BUSINESS', id: campaign.brandId } as const;
    const name = findArtist(w, j.artistId)?.stageName;
    if (accept) {
      j.inviteAccepted = true;
      openJobContract(w, j);
      notify(w, brand, 'JOB_ASSIGNED', 'Invite accepted', `${name} accepted your invite to “${campaign.title}”.`, '/biz/jobs');
    } else {
      j.status = 'CANCELLED';
      refundEscrow(w, j.escrowId, campaign.title);
      notify(w, brand, 'JOB_ASSIGNED', 'Invite declined', `${name} declined “${campaign.title}”. Your escrow was refunded.`, '/biz/jobs');
    }
  });
}

export function signJobContract(jobId: JobId) {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    const c = jobContract(w, jobId);
    if (!j || !c) return;
    const me = personRef(findArtist(w, j.artistId)!.personId);
    if (!c.signedBy.some((p) => p.kind === me.kind && p.id === me.id)) c.signedBy.push(me);
    c.status = 'ACTIVE';
  });
}

/** Submit a proposal to an open campaign. The simulated brand views, shortlists, then accepts (or rejects an overpriced pitch). */
export function submitProposal(campaignId: CampaignId, artistId: ArtistId, pitch: string, price: Minor): ProposalId {
  const id = newId('prp');
  commit((s) => {
    const w = s.world;
    w.proposals.unshift({ id, campaignId, artistId, pitch, price, status: 'SUBMITTED', createdAt: nowISO() });
    const c = byId(w.campaigns, campaignId)!;
    notify(w, { kind: 'BUSINESS', id: c.brandId }, 'DRAFT_SUBMITTED', 'New creator proposal', `${findArtist(w, artistId)?.stageName} pitched “${c.title}”.`, '/biz/campaigns');
  });
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const p = byId(w.proposals, id);
    if (p?.status !== 'SUBMITTED') return;
    p.status = 'SHORTLISTED';
    const c = byId(w.campaigns, campaignId)!;
    notify(w, personRef(findArtist(w, artistId)!.personId), 'JOB_ASSIGNED', 'You’re shortlisted', `${byId(w.businesses, c.brandId)?.name} shortlisted your proposal for “${c.title}”.`, '/creator/inbox?tab=proposals');
  });
  later(DELAY.slow, (s) => {
    const w = s.world;
    const p = byId(w.proposals, id);
    const c = byId(w.campaigns, campaignId);
    const artist = findArtist(w, artistId);
    if (!p || !c || !artist || p.status !== 'SHORTLISTED') return;
    const creator = personRef(artist.personId);
    const brandName = byId(w.businesses, c.brandId)?.name;
    // A brand won't go far past its per-creator fee.
    if (p.price > c.feePerCreator * 1.5) {
      p.status = 'REJECTED';
      notify(w, creator, 'JOB_ASSIGNED', 'Proposal not selected', `${brandName} went with other creators for “${c.title}”. Your price was well above their budget of ${formatKES(c.feePerCreator)}.`, '/creator/inbox?tab=proposals');
      return;
    }
    p.status = 'ACCEPTED';
    const jobId = newId('job');
    const brand = { kind: 'BUSINESS', id: c.brandId } as const;
    const escrowId = openEscrow(w, { subject: { kind: 'JOB', id: jobId }, payer: brand, payee: creator, amount: p.price, trigger: 'JOB_CONFIRMED', funded: false, feeBps: currentPolicy(w).creatorJobFeeBps });
    const base = { id: jobId, campaignId, artistId, source: 'OPEN_PROPOSAL' as const, fee: p.price, escrowId, drafts: [], inviteAccepted: true };
    const job: Job = c.jobType === 'INFLUENCE' ? { ...base, jobType: 'INFLUENCE', status: 'ASSIGNED' } : { ...base, jobType: 'INSIGHTS', status: 'ASSIGNED' };
    w.jobs.unshift(job);
    const brandBiz = byId(w.businesses, c.brandId);
    fundEscrow(w, escrowId, brandBiz && brandBiz.wallet.balance >= p.price ? 'WALLET' : 'CARD', `Creator job: ${c.title}`);
    openJobContract(w, job);
    notify(w, creator, 'JOB_ASSIGNED', `${brandName} accepted your proposal`, `“${c.title}” is now an active job. Sign the agreement to start.`, `/creator/jobs/${jobId}`);
  });
  return id;
}

/** Simulated brand review of a draft: the first influence draft gets a revision request, later drafts are approved. */
function brandReviews(jobId: JobId) {
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'DRAFT_SUBMITTED') return;
    const c = byId(w.campaigns, j.campaignId)!;
    const creator = personRef(findArtist(w, j.artistId)!.personId);
    const draft = j.drafts.at(-1)!;
    if (j.jobType === 'INFLUENCE' && j.drafts.length === 1) {
      j.status = 'REVISION_REQUESTED';
      draft.feedback = 'Great energy! Could the product be visible in the first 3 seconds, and can you tag the brand in the caption?';
      notify(w, creator, 'DRAFT_SUBMITTED', 'Revision requested', `${byId(w.businesses, c.brandId)?.name} left feedback on your draft for “${c.title}”.`, `/creator/jobs/${j.id}`);
      return;
    }
    j.status = 'APPROVED';
    draft.feedback = j.jobType === 'INFLUENCE' ? 'Approved. Go ahead and post at the scheduled time.' : 'Thanks, really useful feedback.';
    notify(w, creator, 'DRAFT_SUBMITTED', 'Draft approved', j.jobType === 'INFLUENCE' ? `Schedule and post your content for “${c.title}”.` : `Your insights for “${c.title}” were approved.`, `/creator/jobs/${j.id}`);
    // Insights have no posting step: the brand confirms right after approving.
    if (j.jobType === 'INSIGHTS') brandConfirms(jobId);
  });
}

/** Simulated brand confirms the work (live post or insights), then escrow is released after the compressed hold. */
function brandConfirms(jobId: JobId) {
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || (j.jobType === 'INFLUENCE' ? j.status !== 'POSTED' : j.status !== 'APPROVED')) return;
    j.status = 'CONFIRMED';
    markFulfilled(w, j.escrowId);
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, personRef(findArtist(w, j.artistId)!.personId), 'JOB_CONFIRMED', 'Work confirmed', `${byId(w.businesses, c.brandId)?.name} confirmed “${c.title}”. Payment is releasing.`, `/creator/jobs/${j.id}`);
  });
  later(DELAY.counterparty * 2, (s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.status !== 'CONFIRMED') return;
    j.status = 'PAID';
    releaseEscrow(w, j.escrowId, byId(w.campaigns, j.campaignId)!.title);
    const con = jobContract(w, jobId);
    if (con) con.status = 'COMPLETED';
  });
}

export function submitDraft(jobId: JobId, note: string) {
  commit((s) => {
    const j = byId(s.world.jobs, jobId);
    if (!j || (j.status !== 'ASSIGNED' && j.status !== 'REVISION_REQUESTED') || j.jobType !== 'INFLUENCE') return;
    j.drafts.push({ submittedAt: nowISO(), note });
    j.status = 'DRAFT_SUBMITTED';
  });
  brandReviews(jobId);
}

export function submitInsights(jobId: JobId, answers: string[], note: string) {
  commit((s) => {
    const j = byId(s.world.jobs, jobId);
    if (!j || j.jobType !== 'INSIGHTS' || (j.status !== 'ASSIGNED' && j.status !== 'REVISION_REQUESTED')) return;
    j.surveyAnswers = answers;
    j.drafts.push({ submittedAt: nowISO(), note });
    j.status = 'DRAFT_SUBMITTED';
  });
  brandReviews(jobId);
}

export function schedulePost(jobId: JobId, at: ISODate) {
  commit((s) => {
    const j = byId(s.world.jobs, jobId);
    if (j?.jobType === 'INFLUENCE' && j.status === 'APPROVED') j.scheduledFor = at;
  });
}

export function markPosted(jobId: JobId, url: string) {
  commit((s) => {
    const w = s.world;
    const j = byId(w.jobs, jobId);
    if (!j || j.jobType !== 'INFLUENCE' || j.status !== 'APPROVED') return;
    j.status = 'POSTED';
    j.postedUrl = url;
    const c = byId(w.campaigns, j.campaignId)!;
    notify(w, { kind: 'BUSINESS', id: c.brandId }, 'DRAFT_SUBMITTED', 'Creator posted', `${findArtist(w, j.artistId)?.stageName} posted for “${c.title}”. Confirm to release payment.`, '/biz/jobs');
  });
  brandConfirms(jobId);
}
