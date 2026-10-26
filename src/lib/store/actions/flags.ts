'use client';

import { newId, nowISO } from '@/lib/format';
import { flagTargetName } from '@/lib/selectors';
import type { FlagId, FlagTarget, PartyRef } from '@/types';
import { commit } from '../store';
import { notify } from './util';

// Reporting profiles and listings. Unlike disputes no money is frozen, and an admin
// reviews each one from the Reported content queue rather than a simulated ops team.

export function reportContent(target: FlagTarget, raisedBy: PartyRef, reason: string, details: string): FlagId {
  const id = newId('flg');
  commit((s) => {
    const w = s.world;
    w.flags.unshift({ id, target, raisedBy, reason, details, status: 'OPEN', createdAt: nowISO() });
    notify(w, raisedBy, 'CONTENT_REPORTED', 'Thanks for your report', `We’ll review “${flagTargetName(w, target)}” and let you know what we decide. The other party isn’t told who reported it.`);
  });
  return id;
}
