'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#events', label: 'Events' },
  { href: '#artists', label: 'Artists' },
  { href: '#who', label: 'For business' },
  { href: '#how', label: 'How it works' },
];

/** Transparent over the hero, solid once you scroll. */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-colors duration-300', solid ? 'border-b border-border bg-bg/95 backdrop-blur' : 'bg-transparent')}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Logo href="/" light={!solid} />
        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={cn('text-sm font-medium transition', solid ? 'text-muted hover:text-text' : 'text-white/80 hover:text-white')}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <LinkButton href="/home">Open Selah</LinkButton>
          ) : (
            <>
              <Link href="/login" className={cn('hidden px-3 text-sm font-medium sm:block', solid ? 'text-text' : 'text-white')}>
                Log in
              </Link>
              <LinkButton href="/register">Sign up</LinkButton>
            </>
          )}
          <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)} className={cn('ml-1 rounded-lg p-2 lg:hidden', solid ? 'text-text' : 'text-white')}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium text-text hover:bg-surface-2">
              {l.label}
            </a>
          ))}
          {!signedIn && (
            <Link href="/login" className="rounded-lg px-2 py-2.5 text-sm font-medium text-text hover:bg-surface-2 sm:hidden">
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
