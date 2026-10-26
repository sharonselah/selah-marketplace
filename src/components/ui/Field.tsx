import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-full bg-surface-2 px-4 text-sm text-text placeholder:text-muted/70 outline-none transition focus:bg-surface focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-text">{label}</span>}
      {children}
      {error ? <span className="text-xs text-bad">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, prefix, ...rest }: ComponentProps<'input'> & { prefix?: ReactNode }) {
  if (prefix) {
    return (
      <div className={cn(control, 'flex h-11 items-center gap-2 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand/30', className)}>
        <span className="text-sm text-muted">{prefix}</span>
        <input className="h-full flex-1 bg-transparent outline-none" {...rest} />
      </div>
    );
  }
  return <input className={cn(control, 'h-11', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 rounded-tile py-2.5', className)} {...rest} />;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  placeholder,
}: {
  value: T | '';
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
  placeholder?: string;
}) {
  return (
    <select className={cn(control, 'h-11 appearance-none pr-8', className)} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, description, ...rest }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" {...rest} />
      <span className="flex flex-col">
        <span className="text-sm text-text">{label}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm">
      <span className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-brand' : 'bg-border')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow-card transition', checked ? 'left-5.5' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

/** Large selectable cards: radio (single) or checkbox (multi) semantics decided by the caller. */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-tile p-4 text-left transition',
        selected ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface shadow-card hover:shadow-raised',
      )}
    >
      {icon && <span className={cn('mt-0.5 shrink-0', selected ? 'text-brand' : 'text-muted')}>{icon}</span>}
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold text-text">
          {title}
          {badge}
        </span>
        {description && <span className="text-xs leading-relaxed text-muted">{description}</span>}
      </span>
    </button>
  );
}
