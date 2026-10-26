'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { AUDIENCES, type AudienceKey } from './content';

export function AudienceTabs() {
  const [active, setActive] = useState<AudienceKey>('partygoer');
  const a = AUDIENCES.find((x) => x.key === active)!;

  return (
    <div>
      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:justify-center md:px-0">
        {AUDIENCES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === active}
            onClick={() => setActive(key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              key === active ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface text-text hover:bg-surface-2',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div key={a.key} role="tabpanel" className="mt-8 grid animate-[fadeIn_.35s_ease] overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-2">
        <div className="relative min-h-72 md:min-h-[28rem]">
          <Image src={a.image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center p-6 md:p-10">
          <h3 className="text-2xl font-bold tracking-tight text-text md:text-3xl">{a.title}</h3>
          <ul className="mt-6 flex flex-col gap-3">
            {a.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-muted">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
                {p}
              </li>
            ))}
          </ul>
          <LinkButton href={a.href} size="lg" className="mt-8 self-start" icon={<ArrowRight className="size-4" />}>
            {a.cta}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
