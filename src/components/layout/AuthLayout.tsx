import type { ReactNode } from 'react';
import { Logo } from './Logo';

/** Split-screen on desktop: brand panel left, form card right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 md:grid-cols-2">
      <div className="cover-g4 relative hidden flex-col justify-between p-10 text-white md:flex">
        <Logo href="/" className="text-white [&>span:first-child]:bg-white [&>span:first-child]:text-brand" />
        <div className="max-w-md">
          <p className="text-3xl leading-tight font-semibold">Nightlife, artists and bookings, all paid safely through escrow.</p>
          <p className="mt-4 text-white/75">Buy tickets and tables, book a DJ for your party, or earn as an artist, creator or venue.</p>
        </div>
        <p className="text-xs text-white/60">Prototype · no real payments, messages or verification</p>
      </div>
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 md:hidden">
          <Logo href="/" />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
