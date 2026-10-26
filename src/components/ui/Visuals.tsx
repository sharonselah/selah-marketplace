import { Check, Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/constants/labels';

/** Payment rails in their own brand colours (M-Pesa green, card navy), so they read as the real thing. */
export function PayMark({ method, className }: { method: 'MPESA' | 'CARD' | 'WALLET' | 'BANK'; className?: string }) {
  const base = 'grid size-10 shrink-0 place-items-center rounded-full text-white';
  if (method === 'MPESA') return <span className={cn(base, 'bg-pay-mpesa text-[10px] font-bold tracking-tight', className)}>M-PESA</span>;
  if (method === 'CARD') return <span className={cn(base, 'bg-pay-card text-[10px] font-bold italic tracking-wide', className)}>VISA</span>;
  if (method === 'BANK') return <span className={cn(base, 'bg-pay-bank', className)}><Landmark className="size-4" /></span>;
  return <span className={cn(base, 'bg-brand', className)}><Wallet className="size-4" /></span>;
}

/** Decorative QR: a deterministic grid derived from the string. Not scannable. */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const n = 21;
  let seed = [...value].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 16) & 1;
  };
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const ring = (ox: number, oy: number) => {
      const dx = x - ox;
      const dy = y - oy;
      return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    };
    if (inBox(0, 0)) return ring(0, 0) ? 1 : 0;
    if (inBox(n - 7, 0)) return ring(n - 7, 0) ? 1 : 0;
    if (inBox(0, n - 7)) return ring(0, n - 7) ? 1 : 0;
    return -1;
  };
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      if (f === 1 || (f === -1 && rand())) cells.push([x, y]);
    }
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} className="rounded-tile bg-white" role="img" aria-label={`QR code ${value}`}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" />
      ))}
    </svg>
  );
}

/** Horizontal state-machine track. `current` is the reached state; `failed` marks a terminal off-path state. */
export function Timeline<S extends string>({ steps, current, failed, labels }: { steps: readonly S[]; current: S; failed?: string; labels?: Partial<Record<S, string>> }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = idx >= 0 && i <= idx;
          return (
            <li key={s} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted')}>
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < steps.length - 1 && <span className={cn('mx-1 h-0.5 flex-1 rounded', i < idx ? 'bg-brand' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>
      <div className="flex justify-between gap-1 text-[11px] text-muted">
        {steps.map((s) => (
          <span key={s} className={cn('flex-1 text-center first:text-left last:text-right', s === current && 'font-semibold text-text')}>
            {labels?.[s] ?? humanize(s)}
          </span>
        ))}
      </div>
      {failed && <div className="text-xs font-medium text-bad">{humanize(failed)}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
