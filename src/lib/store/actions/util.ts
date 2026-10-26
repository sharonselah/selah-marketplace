import type { NotificationEvent } from '@/lib/constants/enums';
import { newId, nowISO } from '@/lib/format';
import { byId } from '@/lib/selectors';
import type { Minor, PartyRef, Transaction, World } from '@/types';

// Small mutation helpers shared by action modules. They mutate a draft World.

export function notify(w: World, to: PartyRef, event: NotificationEvent, title: string, body: string, href?: string) {
  w.notifications.unshift({ id: newId('ntf'), to, event, channel: 'IN_APP', title, body, href, at: nowISO(), read: false });
}

export function walletRef(w: World, ref: PartyRef): { balance: Minor } {
  const owner = ref.kind === 'PERSON' ? byId(w.people, ref.id) : byId(w.businesses, ref.id);
  if (!owner) throw new Error(`No wallet for ${ref.kind}:${ref.id}`);
  return owner.wallet;
}

export function credit(w: World, ref: PartyRef, amount: Minor) {
  const wallet = walletRef(w, ref);
  wallet.balance = (wallet.balance + amount) as Minor;
}

export function debit(w: World, ref: PartyRef, amount: Minor) {
  const wallet = walletRef(w, ref);
  wallet.balance = (wallet.balance - amount) as Minor;
}

export function record(w: World, t: Omit<Transaction, 'id' | 'at'>) {
  w.transactions.unshift({ id: newId('txn'), at: nowISO(), ...t });
}

/** Facade delays: short enough to demo, long enough to read the animation. */
export const DELAY = {
  quick: 1500,
  counterparty: 6000,
  slow: 12000,
} as const;
