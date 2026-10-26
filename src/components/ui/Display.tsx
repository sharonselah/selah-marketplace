import type { ReactNode } from 'react';
import Image from 'next/image';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { humanize, type Tone } from '@/lib/constants/labels';
import { avatarPhoto } from '@/lib/data/photos';
import { formatKES, initials } from '@/lib/format';
import type { Minor } from '@/types';

/** `tone` highlights a card with a soft tint (never a border): brand for "your move", good for "done". */
const CARD_TONE = { default: 'bg-surface', brand: 'bg-brand-soft/60', good: 'bg-good-soft/60' } as const;

export function Card({ children, className, padded = true, tone = 'default' }: { children: ReactNode; className?: string; padded?: boolean; tone?: keyof typeof CARD_TONE }) {
  return <div className={cn('rounded-card shadow-card', CARD_TONE[tone], padded && 'p-5', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-heading text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  good: 'bg-good-soft text-good',
  bad: 'bg-bad-soft text-bad',
  brand: 'bg-brand-soft text-brand',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONE[tone], className)}>{children}</span>;
}

/** Status badge driven by a tone map: <StatusPill status={job.status} tones={JOB_TONE} />. */
export function StatusPill<S extends string>({ status, tones, label }: { status: S; tones: Record<S, Tone>; label?: string }) {
  return <Badge tone={tones[status]}>{label ?? humanize(status)}</Badge>;
}

export function Money({ amount, className, compact }: { amount: Minor; className?: string; compact?: boolean }) {
  return <span className={cn('tabular-nums', className)}>{formatKES(amount, { compact })}</span>;
}

export function Avatar({ name, size = 'md', className, verified }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; verified?: boolean }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' };
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 8;
  const photo = avatarPhoto(name);
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {photo ? (
        <span className={cn('relative overflow-hidden rounded-full bg-surface-2', sizes[size])}>
          <Image src={photo} alt={name} fill sizes="80px" className="object-cover" />
        </span>
      ) : (
        <span className={cn('orb inline-flex items-center justify-center rounded-full font-semibold text-white', `cover-g${hue}`, sizes[size])}>{initials(name)}</span>
      )}
      {verified && <BadgeCheck className="absolute -right-1 -bottom-1 size-4 rounded-full bg-surface text-brand" />}
    </span>
  );
}

/** Artwork tile. With `photo`, the image fills it and a bottom scrim keeps overlaid text readable. */
export function Cover({ cover, photo, className, children }: { cover: string; photo?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn(`cover-${cover} relative isolate overflow-hidden`, className)}>
      {photo && (
        <>
          <Image src={photo} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="-z-10 object-cover" />
          <span className="absolute inset-0 -z-10 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
        </>
      )}
      {children}
    </div>
  );
}

/** One spot of colour for an item with no photo: a lit sphere, hue fixed by the name. */
export function Orb({ name, size = 'md', children, className }: { name: string; size?: 'sm' | 'md' | 'lg'; children?: ReactNode; className?: string }) {
  const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-14' };
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 8;
  return <span className={cn('orb grid shrink-0 place-items-center rounded-full text-white', `cover-g${hue}`, sizes[size], className)}>{children}</span>;
}

const ICON_TONE = {
  brand: 'bg-brand-soft text-brand',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  neutral: 'bg-surface-2 text-muted',
};

/** Icon in a pale tinted circle: tells a row's type at a glance without loud colour. */
export function IconCircle({ icon, tone = 'brand', className }: { icon: ReactNode; tone?: keyof typeof ICON_TONE; className?: string }) {
  return <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', ICON_TONE[tone], className)}>{icon}</span>;
}

/** `icon` is accepted for compatibility but no longer rendered. */
export function Stat({ label, value, hint, icon, children }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="text-label text-muted uppercase">{label}</div>
        {icon && <span className="-my-1 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>}
      </div>
      <div className="mt-2 text-title text-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      {children}
    </Card>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-surface-2 px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <div className="text-heading text-text">{title}</div>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-title text-text">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function DefinitionList({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-1">
      {items.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
