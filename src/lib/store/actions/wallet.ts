'use client';

import type { PaymentMethod, PayoutMethod } from '@/lib/constants/enums';
import { formatKES, newId, nowISO } from '@/lib/format';
import { byId, currentPolicy, walletOf } from '@/lib/selectors';
import type { Minor, PartyRef, Payout, PayoutId, World } from '@/types';
import { commit, getState } from '../store';
import { credit, debit, notify, record } from './util';

export function topUp(party: PartyRef, amount: Minor, method: Exclude<PaymentMethod, 'WALLET'>) {
  commit((s) => {
    credit(s.world, party, amount);
    record(s.world, { party, amount, direction: 'IN', description: `Wallet top-up via ${method === 'MPESA' ? 'M-Pesa' : 'card'}`, method, status: 'RELEASED', ref: { kind: 'TOPUP' } });
    notify(s.world, party, 'WALLET_TOPUP', 'Wallet topped up', `${formatKES(amount)} added to your wallet.`, '/wallet');
  });
}

export function payoutError(party: PartyRef, amount: Minor): string | null {
  const w = getState().world;
  const min = currentPolicy(w).minPayoutThreshold;
  if (amount < min) return `Minimum payout is ${formatKES(min)}.`;
  if (amount > walletOf(w, party)) return 'That’s more than your available balance.';
  return null;
}

/** Large withdrawals wait for an admin (policy `payoutReviewAbove`). */
export const payoutNeedsReview = (amount: Minor) => amount > currentPolicy(getState().world).payoutReviewAbove;

const payoutTxn = (w: World, id: PayoutId) => w.transactions.find((t) => t.ref.kind === 'PAYOUT' && t.ref.id === id);

/** The money leaves the wallet at once, so it can't be spent twice; it sits in transit until settled or returned. */
export function queuePayout(w: World, party: PartyRef, amount: Minor, method: PayoutMethod, source: Payout['source']): PayoutId {
  const id = newId('pay');
  debit(w, party, amount);
  w.payouts.unshift({ id, party, amount, method, status: 'PENDING', source, at: nowISO() });
  record(w, { party, amount, direction: 'OUT', description: `Payout to ${method === 'MPESA' ? 'M-Pesa' : 'bank'}`, status: 'PENDING', ref: { kind: 'PAYOUT', id } });
  return id;
}

export function settlePayout(w: World, id: PayoutId) {
  const p = byId(w.payouts, id);
  if (!p || p.status !== 'PENDING') return;
  p.status = 'RELEASED';
  p.settledAt = nowISO();
  const t = payoutTxn(w, id);
  if (t) t.status = 'RELEASED';
  notify(w, p.party, 'PAYMENT_RELEASED', 'Payout sent', `${formatKES(p.amount)} is on its way to your ${p.method === 'MPESA' ? 'M-Pesa' : 'bank account'}.`);
}

export function returnPayout(w: World, id: PayoutId, note: string) {
  const p = byId(w.payouts, id);
  if (!p || p.status !== 'PENDING') return;
  p.status = 'FAILED';
  p.settledAt = nowISO();
  p.note = note || undefined;
  credit(w, p.party, p.amount);
  const t = payoutTxn(w, id);
  if (t) t.status = 'FAILED';
  notify(w, p.party, 'PAYMENT_RELEASED', 'Payout not sent', `${formatKES(p.amount)} is back in your Selah wallet.${note ? ` Note from Selah: ${note}` : ''}`, '/wallet');
}

export function requestPayout(party: PartyRef, amount: Minor, method: PayoutMethod) {
  let id: PayoutId | undefined;
  commit((s) => {
    const w = s.world;
    id = queuePayout(w, party, amount, method, 'REQUEST');
    if (amount <= currentPolicy(w).payoutReviewAbove) settlePayout(w, id);
    else notify(w, party, 'PAYMENT_HELD', 'Payout in review', `${formatKES(amount)} is reserved from your wallet. Selah reviews large withdrawals, usually within a day.`, '/wallet');
  });
  return id!;
}
