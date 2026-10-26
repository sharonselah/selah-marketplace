'use client';

import { byId } from '@/lib/selectors';
import type { BusinessAccount, PartyRef, Person, Session, World } from '@/types';
import { useAppState, type AppState } from './store';

/** Inside the HydrationGate the state is always loaded. */
export function useStore(): AppState {
  const s = useAppState();
  if (!s) throw new Error('useStore used outside HydrationGate');
  return s;
}

export function useWorld(): World {
  return useStore().world;
}

export interface Viewer {
  world: World;
  session: Session;
  me: Person;
  /** The account the user is currently operating as. */
  actingAs: PartyRef;
  business?: BusinessAccount;
}

/** Inside the authenticated app shell the session is guaranteed. */
export function useViewer(): Viewer {
  const { world, session } = useStore();
  if (!session) throw new Error('useViewer used without a session');
  const me = byId(world.people, session.personId)!;
  const business = session.actingAs.kind === 'BUSINESS' ? byId(world.businesses, session.actingAs.id) : undefined;
  return { world, session, me, actingAs: session.actingAs, business };
}
