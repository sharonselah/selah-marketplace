'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { byId } from '@/lib/selectors';
import { useStore } from '@/lib/store/hooks';
import { Splash } from './HydrationGate';

/** Signed-in only. Sends guests to /login. */
export function RequireSession({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { session, world } = useStore();
  const router = useRouter();
  const me = session ? byId(world.people, session.personId) : undefined;
  const allowed = !!me && (!admin || !!me.isAdmin);

  useEffect(() => {
    if (!me) router.replace('/login');
    else if (admin && !me.isAdmin) router.replace('/home');
  }, [me, admin, router]);

  return allowed ? <>{children}</> : <Splash />;
}

/** Guests only. Sends signed-in users to their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session, world } = useStore();
  const router = useRouter();
  const home = session && byId(world.people, session.personId)?.isAdmin ? '/admin' : '/home';
  useEffect(() => {
    if (session) router.replace(home);
  }, [session, home, router]);
  return session ? <Splash /> : <>{children}</>;
}
