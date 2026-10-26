import { Minus, Plus } from 'lucide-react';

export function QtyStepper({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Decrease" disabled={value <= 0} onClick={() => onChange(value - 1)} className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-text hover:bg-brand-soft disabled:opacity-40">
        <Minus className="size-4" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums text-text">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)} className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-text hover:bg-brand-soft disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
