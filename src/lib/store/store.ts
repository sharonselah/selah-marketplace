'use client';

import { useSyncExternalStore } from 'react';
import { buildSeedWorld } from '@/lib/data/seed';
import type { PersonId, Session, World } from '@/types';

// The fake backend: one in-memory state, mirrored to localStorage, seeded from the mock world.

export interface PendingAuth {
  mode: 'REGISTER' | 'LOGIN';
  channel: 'SMS' | 'EMAIL';
  /** Where the "code" was sent (display only). */
  destination: string;
  personId?: PersonId;
  draft?: { name: string; phone: string; email?: string; location: string; referralCode?: string };
  sentAt: string;
}

export interface AppState {
  version: number;
  world: World;
  session: Session | null;
  pendingAuth: PendingAuth | null;
}

const STORAGE_KEY = 'selah-prototype';
// Bump when the seed or types change shape so old saved worlds are discarded.
const VERSION = 5;

let state: AppState | null = null;
const listeners = new Set<() => void>();

function fresh(): AppState {
  return { version: VERSION, world: buildSeedWorld(), session: null, pendingAuth: null };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === VERSION) return parsed;
    }
  } catch {
    // corrupted or unavailable storage, fall through to a fresh seed
  }
  return fresh();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked; the prototype keeps working in memory
  }
}

function emit() {
  for (const l of listeners) l();
}

function getSnapshot(): AppState {
  if (!state) {
    state = load();
    persist();
  }
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep tabs in sync: acting in one tab updates the others.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    emit();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Read the current state outside React (actions). */
export function getState(): AppState {
  return getSnapshot();
}

/** Apply a mutation to a draft copy, then publish it. */
export function commit(mutate: (draft: AppState) => void) {
  const draft = structuredClone(getSnapshot());
  mutate(draft);
  state = draft;
  persist();
  emit();
}

/** Run a mutation after a delay: how simulated counterparties respond. */
export function later(ms: number, mutate: (draft: AppState) => void) {
  setTimeout(() => commit(mutate), ms);
}

export function resetPrototype() {
  state = fresh();
  persist();
  emit();
}

/** null during SSR / first hydration pass; the HydrationGate shows a splash meanwhile. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
