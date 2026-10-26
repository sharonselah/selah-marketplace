'use client';

import { kes, maskEmail, maskPhone, newId, normalizeKenyanPhone, nowISO } from '@/lib/format';
import { byId, currentPolicy, personRef } from '@/lib/selectors';
import type { PartyRef, Person, PersonId } from '@/types';
import { commit, getState } from '../store';
import { notify } from './util';

/** The OTP the facade hints at; any 6 digits are accepted. */
export const DEMO_OTP = '123456';

type Result = { ok: true } | { ok: false; error: string };

function findByIdentifier(identifier: string): Person | undefined {
  const { world } = getState();
  const phone = normalizeKenyanPhone(identifier);
  const email = identifier.trim().toLowerCase();
  return world.people.find((p) => (phone && p.phone === phone) || (p.email && p.email.toLowerCase() === email));
}

/** Referral codes are SLH + 3 digits (the register form only accepts that shape); skip ones already taken. */
function freshReferralCode(people: Person[]): string {
  const taken = new Set(people.map((p) => p.referralCode));
  let code: string;
  do code = `SLH${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  while (taken.has(code) && taken.size < 1000);
  return code;
}

export function startRegistration(input: {
  name: string;
  phone: string;
  email?: string;
  location: string;
  channel: 'SMS' | 'EMAIL';
  referralCode?: string;
}): Result {
  const phone = normalizeKenyanPhone(input.phone);
  if (!phone) return { ok: false, error: 'Enter a valid Kenyan mobile number, e.g. 0712 345 678.' };
  if (input.channel === 'EMAIL' && !input.email) return { ok: false, error: 'Add an email address to receive the code by email.' };
  if (findByIdentifier(phone) || (input.email && findByIdentifier(input.email))) {
    return { ok: false, error: 'An account with this phone or email already exists. Log in instead.' };
  }
  commit((s) => {
    s.pendingAuth = {
      mode: 'REGISTER',
      channel: input.channel,
      destination: input.channel === 'SMS' ? maskPhone(phone) : maskEmail(input.email!),
      draft: { name: input.name.trim(), phone, email: input.email?.trim() || undefined, location: input.location, referralCode: input.referralCode?.trim() || undefined },
      sentAt: nowISO(),
    };
  });
  return { ok: true };
}

export function startLogin(identifier: string): Result {
  const person = findByIdentifier(identifier);
  if (!person) return { ok: false, error: 'We couldn’t find an account with that phone or email.' };
  const viaEmail = identifier.includes('@');
  commit((s) => {
    s.pendingAuth = {
      mode: 'LOGIN',
      channel: viaEmail ? 'EMAIL' : 'SMS',
      destination: viaEmail ? maskEmail(person.email!) : maskPhone(person.phone),
      personId: person.id,
      sentAt: nowISO(),
    };
  });
  return { ok: true };
}

export function resendOtp() {
  commit((s) => {
    if (s.pendingAuth) s.pendingAuth.sentAt = nowISO();
  });
}

export function cancelPendingAuth() {
  commit((s) => {
    s.pendingAuth = null;
  });
}

/** Any 6 digits pass. Registration creates the Person; login just opens a session. */
export function verifyOtp(code: string): Result & { mode?: 'REGISTER' | 'LOGIN' } {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6-digit code.' };
  const pending = getState().pendingAuth;
  if (!pending) return { ok: false, error: 'Your code expired. Start again.' };

  commit((s) => {
    const w = s.world;
    let personId: PersonId;
    if (pending.mode === 'REGISTER' && pending.draft) {
      const d = pending.draft;
      personId = newId('per');
      const person: Person = {
        id: personId,
        name: d.name,
        phone: d.phone,
        email: d.email,
        location: d.location,
        createdAt: nowISO(),
        verification: 'PHONE_VERIFIED',
        wallet: { balance: kes(0) },
        businessIds: [],
        referralCode: freshReferralCode(w.people),
      };
      w.people.push(person);
      notify(w, personRef(personId), 'ACCOUNT_CREATED', 'Welcome to Selah', 'Your account is ready. Top up your wallet to start buying.', '/wallet');
      // Referral programme: the referrer earns once this account activates.
      const referrer = d.referralCode && w.people.find((p) => p.referralCode.toUpperCase() === d.referralCode!.toUpperCase());
      if (referrer) {
        const reward = currentPolicy(w).referralReward;
        person.referredBy = referrer.id;
        w.earn.unshift({ id: newId('ern'), personId: referrer.id, programme: 'REFERRAL', inviteeName: d.name, inviteeId: personId, activated: false, reward, rewardStatus: 'PENDING', createdAt: nowISO() });
        notify(w, personRef(referrer.id), 'REWARD_EARNED', 'Your referral signed up', `${d.name} joined with your code. You’ll earn once they make a first purchase.`, '/earn');
      }
    } else {
      personId = pending.personId!;
    }
    s.session = { personId, actingAs: personRef(personId) };
    s.pendingAuth = null;
  });
  return { ok: true, mode: pending.mode };
}

/** Demo shortcut: skip OTP for a seeded account. */
export function loginAs(personId: PersonId) {
  commit((s) => {
    s.session = { personId, actingAs: personRef(personId) };
    s.pendingAuth = null;
  });
}

export function logout() {
  commit((s) => {
    s.session = null;
  });
}

export function switchAccount(to: PartyRef) {
  commit((s) => {
    if (!s.session) return;
    if (to.kind === 'BUSINESS') {
      const me = byId(s.world.people, s.session.personId);
      if (!me?.businessIds.includes(to.id)) return;
    }
    s.session.actingAs = to;
  });
}
