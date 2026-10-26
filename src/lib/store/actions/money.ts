import type { FulfillmentTrigger, PaymentMethod } from '@/lib/constants/enums';
import { newId, nowISO } from '@/lib/format';
import { byId, computeSplits, currentPolicy, partyName, payeeShare, type FeeType } from '@/lib/selectors';
import type { Escrow, EscrowId, EscrowSubject, Minor, PartyRef, World } from '@/types';
import { credit, debit, notify, record } from './util';

// The money spine (Part 6), shared by every sell-side flow.

export function openEscrow(
  w: World,
  args: { subject: EscrowSubject; payer: PartyRef; payee: PartyRef; amount: Minor; trigger: FulfillmentTrigger; funded: boolean; feeBps?: number; feeType?: FeeType },
): EscrowId {
  const p = currentPolicy(w);
  const id = newId('esc');
  const heldAt = args.funded ? nowISO() : undefined;
  const escrow: Escrow = {
    id,
    subject: args.subject,
    payer: args.payer,
    payee: args.payee,
    amount: args.amount,
    state: args.funded ? 'FUNDS_HELD' : 'AWAITING_FUNDS',
    trigger: args.trigger,
    heldAt,
    releaseAt: heldAt ? new Date(Date.now() + p.escrowHoldHours * 3600_000).toISOString() : undefined,
    splits: computeSplits(args.amount, args.payee, p, args.feeBps, args.feeType),
  };
  w.escrows.unshift(escrow);
  return id;
}

/** Take the payer's money: wallet debit, or a simulated M-Pesa/card charge. */
export function charge(w: World, payer: PartyRef, amount: Minor, method: PaymentMethod, description: string, ref: EscrowSubject) {
  if (method === 'WALLET') debit(w, payer, amount);
  record(w, { party: payer, amount, direction: 'OUT', description, method, status: 'HELD', ref });
}

export function fundEscrow(w: World, escrowId: EscrowId, method: PaymentMethod, description: string) {
  const e = byId(w.escrows, escrowId)!;
  charge(w, e.payer, e.amount, method, description, e.subject);
  e.state = 'FUNDS_HELD';
  e.heldAt = nowISO();
  e.releaseAt = new Date(Date.now() + currentPolicy(w).escrowHoldHours * 3600_000).toISOString();
  notify(w, e.payee, 'PAYMENT_HELD', 'Payment secured in escrow', `${partyName(w, e.payer)} paid. Funds are held until fulfilment.`);
}

export function markFulfilled(w: World, escrowId: EscrowId) {
  const e = byId(w.escrows, escrowId);
  if (e && e.state === 'FUNDS_HELD') e.state = 'FULFILLED';
}

/** Release to the payee (after the hold period, which the facade compresses). */
export function releaseEscrow(w: World, escrowId: EscrowId, label: string) {
  const e = byId(w.escrows, escrowId);
  if (!e || e.state === 'RELEASED' || e.state === 'REFUNDED') return;
  e.state = 'RELEASED';
  const share = payeeShare(e);
  credit(w, e.payee, share);
  record(w, { party: e.payee, amount: share, direction: 'IN', description: `Released: ${label}`, status: 'RELEASED', ref: e.subject });
  for (const t of w.transactions) if (t.status === 'HELD' && t.ref.kind === e.subject.kind && 'id' in t.ref && t.ref.id === e.subject.id) t.status = 'RELEASED';
  notify(w, e.payee, 'PAYMENT_RELEASED', 'Payment released', `${label}: ${(share / 100).toLocaleString('en-KE')} KES is now in your wallet.`);
}

export function refundEscrow(w: World, escrowId: EscrowId, label: string) {
  const e = byId(w.escrows, escrowId);
  if (!e || e.state === 'RELEASED' || e.state === 'REFUNDED') return;
  const wasFunded = e.state !== 'AWAITING_FUNDS';
  e.state = 'REFUNDED';
  if (!wasFunded) return;
  credit(w, e.payer, e.amount);
  record(w, { party: e.payer, amount: e.amount, direction: 'IN', description: `Refund: ${label}`, status: 'REFUNDED', ref: e.subject });
  for (const t of w.transactions) if (t.ref.kind === e.subject.kind && 'id' in t.ref && t.ref.id === e.subject.id && t.direction === 'OUT') t.status = 'REFUNDED';
  notify(w, e.payer, 'PAYMENT_RELEASED', 'Refund issued', `${label}: your money is back in your Selah wallet.`, '/wallet');
}
