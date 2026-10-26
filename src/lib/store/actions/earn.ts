'use client';

import { formatKES, newId, nowISO } from '@/lib/format';
import { byId, currentPolicy, personRef } from '@/lib/selectors';
import type { EarnEntry, EarnId, PersonId, World } from '@/types';
import { commit, later } from '../store';
import { DELAY, credit, notify, record } from './util';

// Earn with Selah (2.3): submissions are reviewed by a simulated ops team, then rewarded.

function payReward(w: World, id: EarnId) {
  const e = byId(w.earn, id);
  if (!e || e.rewardStatus === 'PAID' || e.rewardStatus === 'REJECTED') return;
  e.rewardStatus = 'PAID';
  const ref = personRef(e.personId);
  credit(w, ref, e.reward);
  record(w, { party: ref, amount: e.reward, direction: 'IN', description: `Reward: ${e.programme.replace(/_/g, ' ').toLowerCase()}`, status: 'RELEASED', ref: { kind: 'REWARD', id } });
  notify(w, ref, 'REWARD_EARNED', 'Reward paid', `${formatKES(e.reward)} has been added to your wallet.`, '/earn');
}

type NewEntry = { programme: 'BECOME_A_MODEL'; note: string } | { programme: 'LYRIC_CONTRIBUTION'; song: string; excerpt: string };

export function submitLead(personId: PersonId, leadName: string, leadPhone: string) {
  const id = newId('ern');
  commit((s) => {
    const reward = currentPolicy(s.world).artistRecruitmentReward;
    s.world.earn.unshift({ id, personId, programme: 'ARTIST_RECRUITMENT', leadName, leadPhone, leadStatus: 'SUBMITTED', reward, rewardStatus: 'PENDING', createdAt: nowISO() });
  });
  // Pipeline: SUBMITTED → CONTACTED → ONBOARDED → ACTIVATED → reward paid.
  const steps = ['CONTACTED', 'ONBOARDED', 'ACTIVATED'] as const;
  steps.forEach((status, i) =>
    later(DELAY.counterparty * (i + 1), (s) => {
      const e = byId(s.world.earn, id);
      if (e?.programme !== 'ARTIST_RECRUITMENT' || e.leadStatus === 'REJECTED') return;
      e.leadStatus = status;
      if (status === 'ONBOARDED') e.rewardStatus = 'APPROVED';
      if (status === 'ACTIVATED') payReward(s.world, id);
      else notify(s.world, personRef(personId), 'REWARD_EARNED', `Lead update: ${leadName}`, `Your lead is now ${status.toLowerCase()}.`, '/earn');
    }),
  );
  return id;
}

export function submitEntry(personId: PersonId, entry: NewEntry) {
  const id = newId('ern');
  commit((s) => {
    const p = currentPolicy(s.world);
    const reward = entry.programme === 'BECOME_A_MODEL' ? p.modelProgrammeReward : p.lyricReward;
    s.world.earn.unshift({ ...entry, id, personId, reward, rewardStatus: 'PENDING', createdAt: nowISO() } as EarnEntry);
  });
  later(DELAY.counterparty, (s) => {
    const e = byId(s.world.earn, id);
    if (e?.rewardStatus !== 'PENDING') return;
    e.rewardStatus = 'APPROVED';
    notify(s.world, personRef(personId), 'REWARD_EARNED', 'Submission approved', 'Your reward is being processed.', '/earn');
  });
  later(DELAY.counterparty * 2, (s) => payReward(s.world, id));
  return id;
}

/** Admin moderation (Phase 8) reuses these. */
export function approveEarn(id: EarnId) {
  commit((s) => payReward(s.world, id));
}
export function rejectEarn(id: EarnId) {
  commit((s) => {
    const e = byId(s.world.earn, id);
    if (e) e.rewardStatus = 'REJECTED';
  });
}
