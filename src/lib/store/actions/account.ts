'use client';

import { normalizeKenyanPhone } from '@/lib/format';
import { byId, samePartyRef } from '@/lib/selectors';
import type { NotificationId, PartyRef, PersonId, PersonPrefs } from '@/types';
import { commit } from '../store';

export const DEFAULT_PREFS: PersonPrefs = {
  pinEnabled: false,
  biometricEnabled: false,
  language: 'EN',
  notify: { SMS: true, PUSH: true, EMAIL: false },
  profilePublic: true,
};

export function updateProfile(personId: PersonId, patch: { name?: string; email?: string; location?: string; phone?: string }): string | null {
  if (patch.phone !== undefined && !normalizeKenyanPhone(patch.phone)) return 'Enter a valid Kenyan mobile number.';
  commit((s) => {
    const p = byId(s.world.people, personId);
    if (!p) return;
    if (patch.name) p.name = patch.name.trim();
    if (patch.email !== undefined) p.email = patch.email.trim() || undefined;
    if (patch.location) p.location = patch.location;
    if (patch.phone) p.phone = normalizeKenyanPhone(patch.phone)!;
  });
  return null;
}

export function updatePrefs(personId: PersonId, patch: Partial<PersonPrefs>) {
  commit((s) => {
    const p = byId(s.world.people, personId);
    if (p) p.prefs = { ...DEFAULT_PREFS, ...p.prefs, ...patch };
  });
}

export function markNotificationRead(id: NotificationId) {
  commit((s) => {
    const n = byId(s.world.notifications, id);
    if (n) n.read = true;
  });
}

export function markAllRead(to: PartyRef) {
  commit((s) => {
    for (const n of s.world.notifications) if (samePartyRef(n.to, to)) n.read = true;
  });
}
