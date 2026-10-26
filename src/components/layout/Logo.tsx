import Link from 'next/link';
import { cn } from '@/lib/cn';

// Geometric "s" with a spark: drawn in currentColor so callers can recolor the tile and glyph.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn('size-5', className)}>
      <path
        d="M15.5 8.25C15.5 6.3 13.6 5 11.25 5S7 6.3 7 8.25c0 2.1 2.1 2.9 4.25 3.5s4.25 1.45 4.25 3.75c0 2.05-1.9 3.5-4.25 3.5S7 17.55 7 15.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.75" cy="4.75" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ href, className, light }: { href?: string; className?: string; light?: boolean }) {
  const mark = (
    <span className={cn('flex items-center gap-2 text-xl font-bold tracking-tight', light ? 'text-white' : 'text-text', className)}>
      <span className="flex size-8 items-center justify-center rounded-tile bg-brand text-on-brand shadow-card ring-1 ring-inset ring-white/15">
        <LogoMark />
      </span>
      selah
    </span>
  );
  return href ? <Link href={href} aria-label="selah home">{mark}</Link> : mark;
}
