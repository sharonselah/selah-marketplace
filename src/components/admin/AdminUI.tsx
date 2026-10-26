'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { partyName } from '@/lib/selectors';
import type { PartyRef, World } from '@/types';
import { Input } from '@/components/ui/Field';

/** People and businesses share one admin detail route; the ID prefix tells them apart. */
export const adminPartyHref = (ref: PartyRef) => `/admin/people/${ref.id}`;

export function PartyLink({ world, party, className }: { world: World; party: PartyRef | 'PLATFORM'; className?: string }) {
  if (party === 'PLATFORM') return <span className={className}>Selah</span>;
  return (
    <Link href={adminPartyHref(party)} className={cn('font-medium text-text hover:text-brand hover:underline', className)}>
      {partyName(world, party)}
    </Link>
  );
}

export function Table({ head, rows, empty = 'Nothing here.' }: { head: ReactNode[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <div className="rounded-card bg-surface-2 px-4 py-10 text-center text-sm text-muted">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-2 text-label text-muted uppercase">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-2/60">
              {r.map((c, j) => <td key={j} className="px-4 py-2.5 align-middle text-text">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export const matches = (q: string, ...fields: (string | undefined)[]) => !q.trim() || fields.some((f) => f?.toLowerCase().includes(q.trim().toLowerCase()));
