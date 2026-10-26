import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ChipSelect<T extends string>({ options, value, onChange, max }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        const disabled = !on && max !== undefined && value.length >= max;
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-40', on ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text hover:bg-brand-soft')}
          >
            {on && <Check className="size-3.5" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}
