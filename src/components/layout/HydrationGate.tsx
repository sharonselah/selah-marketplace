'use client';

import type { ReactNode } from 'react';
import { useAppState } from '@/lib/store/store';
import { Logo } from './Logo';

/** The store lives in localStorage, so nothing renders until the browser has loaded it. */
export function HydrationGate({ children }: { children: ReactNode }) {
  const state = useAppState();
  if (!state) return <Splash />;
  return <>{children}</>;
}

export function Splash() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}
