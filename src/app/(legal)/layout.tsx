import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 md:px-8">
        <Logo href="/" />
        <nav className="flex gap-4 text-sm">
          <Link href="/terms" className="text-muted hover:text-text">Terms</Link>
          <Link href="/privacy" className="text-muted hover:text-text">Privacy</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 md:px-8">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs text-muted md:px-8">© Selah · Interactive prototype: no real payments, messages or verification take place.</footer>
    </div>
  );
}
