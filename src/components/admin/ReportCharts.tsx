'use client';

import { useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PeriodRow, StreamRow } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { formatKES } from '@/lib/format';
import type { Minor } from '@/types';

/** Charts read the same CSS tokens as the rest of the app, so dark mode follows for free. */
const C = { brand: 'var(--brand)', series2: 'var(--chart-2)', series3: 'var(--chart-3)', series4: 'var(--chart-4)', grid: 'var(--border)', muted: 'var(--muted)', hover: 'var(--surface-2)', surface: 'var(--surface)' };
const tick = { fill: C.muted, fontSize: 11 };
const kes = (v: number) => formatKES(v as Minor, { compact: true }).replace('KES ', '');

type TipRow = { label: string; value: ReactNode; color?: string };

function Tip({ title, rows }: { title: ReactNode; rows: TipRow[] }) {
  return (
    <div className="rounded-tile bg-surface px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-semibold text-text">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-muted">
          {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
          <span className="flex-1">{r.label}</span>
          <span className="font-medium text-text tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

// Recharts hands custom tooltips the hovered datum in payload[0].payload.
type TipProps<T> = { active?: boolean; payload?: readonly { payload?: T }[] };
const hovered = <T,>({ active, payload }: TipProps<T>) => (active ? payload?.[0]?.payload : undefined);

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function GmvChart({ rows }: { rows: PeriodRow[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={kes} width={44} />
          <Tooltip
            cursor={{ fill: C.hover }}
            content={(p: TipProps<PeriodRow>) => {
              const r = hovered(p);
              return r ? (
                <Tip
                  title={r.label}
                  rows={[
                    { label: 'GMV', value: formatKES(r.gmv), color: C.brand },
                    { label: 'Selah fee', value: formatKES(r.revenue) },
                    { label: 'Take rate', value: r.gmv ? `${((r.revenue / r.gmv) * 100).toFixed(1)}%` : '–' },
                    { label: 'Rewards paid', value: formatKES((-r.rewards) as Minor) },
                    { label: 'Net revenue', value: formatKES(r.net) },
                  ]}
                />
              ) : null;
            }}
          />
          <Bar dataKey="gmv" fill={C.brand} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const MONEY_OUT = [
  { key: 'payouts', label: 'Paid out to sellers', color: C.brand },
  { key: 'refunds', label: 'Refunded to buyers', color: C.series2 },
] as const;

export function MoneyOutChart({ rows }: { rows: PeriodRow[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={kes} width={44} />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: '3 3' }}
            content={(p: TipProps<PeriodRow>) => {
              const r = hovered(p);
              return r ? <Tip title={r.label} rows={MONEY_OUT.map((s) => ({ label: s.label, value: formatKES(r[s.key]), color: s.color }))} /> : null;
            }}
          />
          {MONEY_OUT.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }} type="linear" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StreamChart({ rows }: { rows: (StreamRow & { label: string })[] }) {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={C.grid} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={kes} />
          <YAxis type="category" dataKey="label" tick={tick} tickLine={false} axisLine={false} width={140} />
          <Tooltip
            cursor={{ fill: C.hover }}
            content={(p: TipProps<StreamRow & { label: string }>) => {
              const s = hovered(p);
              return s ? (
                <Tip
                  title={s.label}
                  rows={[
                    { label: 'Platform revenue', value: formatKES(s.revenue), color: C.brand },
                    { label: 'GMV', value: formatKES(s.gmv) },
                    { label: 'Payments', value: s.count },
                  ]}
                />
              ) : null;
            }}
          />
          <Bar dataKey="revenue" fill={C.brand} radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Categorical slots in fixed order (validated light and dark); segments take them in sequence. */
export const SERIES = [C.brand, C.series2, C.series3, C.series4] as const;

export type Share = { label: string; amount: Minor; hint?: ReactNode };

const pct = (part: number, total: number) => {
  const v = (part / total) * 100;
  return v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`;
};

/** One bar split into shares of a total. The legend carries every value, so colour is never the only label. */
export function ShareBar({ segments }: { segments: Share[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + Math.max(0, s.amount), 0);
  const dim = (i: number) => active !== null && active !== i && 'opacity-35';
  return (
    <div onMouseLeave={() => setActive(null)}>
      <div className="flex h-4 gap-0.5" role="img" aria-label={segments.map((s) => `${s.label} ${formatKES(s.amount)}`).join(', ')}>
        {total > 0 &&
          segments.map((s, i) =>
            s.amount > 0 ? (
              <div
                key={s.label}
                onMouseEnter={() => setActive(i)}
                className={cn('h-full min-w-1 rounded transition-opacity', dim(i))}
                style={{ flexGrow: s.amount, flexBasis: 0, background: SERIES[i] }}
              />
            ) : null,
          )}
        {total === 0 && <div className="h-full flex-1 rounded bg-surface-2" />}
      </div>
      <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {segments.map((s, i) => (
          <div key={s.label} onMouseEnter={() => setActive(i)} className={cn('flex items-start gap-2.5 text-sm transition-opacity', dim(i))}>
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: SERIES[i] }} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-text">{s.label}</span>
              {s.hint && <span className="text-xs text-muted">{s.hint}</span>}
            </span>
            <span className="flex flex-col items-end tabular-nums">
              <span className="font-medium text-text">{formatKES(s.amount, { compact: true })}</span>
              <span className="text-xs text-muted">{total ? pct(Math.max(0, s.amount), total) : '–'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type SparkRow = { label: string; value: number };

/** Tiny trend for a stat tile: one series from a zero baseline, hover for the period's value. */
export function Sparkline({ data, label }: { data: SparkRow[]; label: string }) {
  return (
    <div className="mt-3 h-10">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            cursor={{ stroke: C.muted, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: 10 }}
            content={(p: TipProps<SparkRow>) => {
              const r = hovered(p);
              return r ? <Tip title={r.label} rows={[{ label, value: formatKES(r.value as Minor), color: C.brand }]} /> : null;
            }}
          />
          <Line dataKey="value" stroke={C.brand} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: C.surface, strokeWidth: 2 }} type="linear" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
