'use client';

import { scheduledDue } from '@/lib/admin';
import type { LeadStatus } from '@/lib/constants/enums';
import type { PolicyVersion } from '@/lib/constants/policy';
import { formatKES } from '@/lib/format';
import { businessRef, byId, findArtist, flagTargetHref, flagTargetName, flagTargetOwner, partyName, personRef, samePartyRef } from '@/lib/selectors';
import type { ArtistId, BusinessId, DisputeId, EarnId, FlagId, PartyRef, PayoutId, PersonId, World } from '@/types';
import { commit } from '../store';
import { approveEarn } from './earn';
import { refundEscrow, releaseEscrow } from './money';
import { notify } from './util';
import { queuePayout, returnPayout, settlePayout } from './wallet';

// Admin console (Phase 8): manual overrides on top of the simulated ops team.

// ---------- Disputes ----------
export type DisputeOutcome = 'BUYER' | 'SELLER' | 'ESCALATE';

export function startDisputeReview(id: DisputeId) {
  commit((s) => {
    const d = byId(s.world.disputes, id);
    if (d?.status === 'OPEN') d.status = 'UNDER_REVIEW';
  });
}

export function resolveDispute(id: DisputeId, outcome: DisputeOutcome, note: string) {
  commit((s) => {
    const w = s.world;
    const d = byId(w.disputes, id);
    const e = d && byId(w.escrows, d.escrowId);
    if (!d || !e || d.status === 'RESOLVED_BUYER' || d.status === 'RESOLVED_SELLER') return;
    const suffix = note ? ` Note from Selah: ${note}` : '';
    if (outcome === 'ESCALATE') {
      d.status = 'ESCALATED';
      for (const p of [e.payer, e.payee]) notify(w, p, 'PAYMENT_HELD', 'Dispute escalated', `“${d.reason}” has gone to senior review. Funds stay frozen.${suffix}`, `/disputes/${id}`);
      return;
    }
    if (outcome === 'BUYER') {
      d.status = 'RESOLVED_BUYER';
      refundEscrow(w, e.id, d.reason);
      setSubjectStatus(w, e.subject, 'REFUNDED');
    } else {
      d.status = 'RESOLVED_SELLER';
      releaseEscrow(w, e.id, d.reason);
      setSubjectStatus(w, e.subject, 'PAID');
    }
    const winner = outcome === 'BUYER' ? 'the buyer' : 'the seller';
    for (const p of [e.payer, e.payee]) notify(w, p, 'PAYMENT_RELEASED', 'Dispute resolved', `“${d.reason}” was resolved in favour of ${winner}.${suffix}`, `/disputes/${id}`);
  });
}

function setSubjectStatus(w: World, subject: World['escrows'][number]['subject'], to: 'REFUNDED' | 'PAID') {
  if (subject.kind === 'ORDER') {
    const o = byId(w.orders, subject.id);
    if (o) o.status = to === 'REFUNDED' ? 'REFUNDED' : 'COMPLETED';
  }
  if (subject.kind === 'BOOKING') {
    const b = byId(w.bookings, subject.id);
    if (b) b.status = to === 'REFUNDED' ? 'CANCELLED' : 'PAID';
  }
}

// ---------- Reported content ----------
/** Upheld warns the owner to fix the listing; either way the reporter hears back. */
export function resolveFlag(id: FlagId, outcome: 'UPHELD' | 'DISMISSED', note: string) {
  commit((s) => {
    const w = s.world;
    const f = byId(w.flags, id);
    if (!f || f.status !== 'OPEN') return;
    f.status = outcome;
    f.note = note || undefined;
    const name = flagTargetName(w, f.target);
    const suffix = note ? ` Note from Selah: ${note}` : '';
    if (outcome === 'UPHELD') {
      const owner = flagTargetOwner(w, f.target);
      if (owner) notify(w, owner, 'CONTENT_REPORTED', 'Action needed on your listing', `“${name}” was reported for: ${f.reason.toLowerCase()}. Please update it within 48 hours or it may be taken down.${suffix}`, flagTargetHref(w, f.target));
      notify(w, f.raisedBy, 'CONTENT_REPORTED', 'Report upheld', `We agreed with your report on “${name}” and asked the owner to fix it. Thanks for keeping Selah safe.${suffix}`);
    } else {
      notify(w, f.raisedBy, 'CONTENT_REPORTED', 'Report reviewed', `We looked into “${name}” and didn’t find a breach of our rules.${suffix}`);
    }
  });
}

// ---------- Verification (manual-review fallback) ----------
export function approveIdentity(personId: PersonId) {
  commit((s) => {
    const p = byId(s.world.people, personId);
    if (!p || p.verification !== 'PHONE_VERIFIED') return;
    p.verification = 'ID_VERIFIED';
    if (p.artist && p.artist.verification === 'PHONE_VERIFIED') p.artist.verification = 'ID_VERIFIED';
    notify(s.world, personRef(personId), 'VERIFICATION_PASSED', 'ID verified', 'Our team reviewed your documents manually. You can now get paid on Selah.', '/settings');
  });
}

export function grantVerifiedArtist(artistId: ArtistId) {
  commit((s) => {
    const a = findArtist(s.world, artistId);
    if (!a || a.verification !== 'ID_VERIFIED') return;
    a.verification = 'VERIFIED_ARTIST';
    notify(s.world, personRef(a.personId), 'VERIFICATION_PASSED', 'Verified Artist badge unlocked', 'You now appear first in search and get faster payouts.', '/artist');
  });
}

export function approveBusiness(id: BusinessId) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (!b || b.verified) return;
    b.verified = true;
    notify(s.world, businessRef(id), 'VERIFICATION_PASSED', 'Business verified', `${b.name} passed manual review and can now sell on Selah.`, '/biz/settings');
  });
}

/** Rejection keeps the account as-is and asks for better documents. */
export function requestResubmission(to: { kind: 'PERSON'; id: PersonId } | { kind: 'BUSINESS'; id: BusinessId }, reason: string) {
  commit((s) => {
    notify(s.world, to, 'VERIFICATION_PASSED', 'Verification needs another try', `${partyName(s.world, to)}: ${reason} Please resubmit from Settings.`, to.kind === 'BUSINESS' ? '/biz/settings' : '/settings');
  });
}

// ---------- Policy ----------
/** Versions are append-only: a new one takes over from its effective date, old escrows keep theirs. */
export function addPolicyVersion(v: PolicyVersion): string | null {
  let error: string | null = null;
  commit((s) => {
    if (s.world.policy.some((p) => p.version === v.version)) {
      error = `Version ${v.version} already exists.`;
      return;
    }
    s.world.policy.push(v);
  });
  return error;
}

// ---------- Earn moderation ----------
export function setLeadStatus(id: EarnId, status: LeadStatus) {
  commit((s) => {
    const e = byId(s.world.earn, id);
    if (e?.programme !== 'ARTIST_RECRUITMENT') return;
    e.leadStatus = status;
    if (status === 'REJECTED') e.rewardStatus = 'REJECTED';
    else if (status === 'ONBOARDED' && e.rewardStatus === 'PENDING') e.rewardStatus = 'APPROVED';
    notify(s.world, personRef(e.personId), 'REWARD_EARNED', `Lead update: ${e.leadName}`, status === 'ACTIVATED' ? `Activated. ${formatKES(e.reward)} is on its way.` : `Your lead is now ${status.toLowerCase()}.`, '/earn');
  });
  if (status === 'ACTIVATED') approveEarn(id);
}

// ---------- Payouts ----------
export function approvePayouts(ids: PayoutId[]) {
  commit((s) => {
    for (const id of ids) settlePayout(s.world, id);
  });
}

export function rejectPayout(id: PayoutId, note: string) {
  commit((s) => returnPayout(s.world, id, note));
}

/** Pay each seller's whole balance to their saved account. Running the batch is the approval. */
export function runScheduledPayouts(parties: PartyRef[]): number {
  let sent = 0;
  commit((s) => {
    const w = s.world;
    const due = scheduledDue(w);
    for (const ref of parties) {
      const d = due.find((x) => samePartyRef(x.party, ref));
      if (!d) continue;
      settlePayout(w, queuePayout(w, d.party, d.balance, d.account.method, 'SCHEDULE'));
      sent++;
    }
  });
  return sent;
}
