'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2, UploadCloud, X, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------- Tabs ----------
export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: readonly { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition', value === t.value ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text')}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-border/70 px-1.5 text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Modal / bottom sheet ----------
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-float sm:rounded-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading text-text">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface-2" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Wizard progress ----------
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full transition', i <= current ? 'bg-brand' : 'bg-border')} />
        ))}
      </div>
      <div className="text-xs text-muted">
        Step {current + 1} of {steps.length} · <span className="font-medium text-text">{steps[current]}</span>
      </div>
    </div>
  );
}

// ---------- The shared facade wait ----------
/**
 * Animated "we're waiting on someone else" sequence. Each step ticks over after `stepMs`,
 * then `onDone` fires. Used for OTP checks, KYC, payments, social tier checks, etc.
 */
export function ProcessingSteps({ steps, stepMs = 1100, onDone, title, done }: { steps: readonly string[]; stepMs?: number; onDone?: () => void; title?: ReactNode; done?: ReactNode }) {
  const [current, setCurrent] = useState(0);
  const finished = current >= steps.length;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (finished) {
      const t = setTimeout(() => onDoneRef.current?.(), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), stepMs);
    return () => clearTimeout(t);
  }, [current, finished, stepMs]);

  return (
    <div className="flex flex-col gap-5">
      {title && <div className="text-center text-heading text-text">{finished && done ? done : title}</div>}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
        {finished ? <div className="h-full w-full bg-good transition-all" /> : <div className="animate-progress h-full w-2/5 rounded-full bg-brand" />}
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-3 text-sm transition', i > current ? 'text-muted/60' : 'text-text')}>
            <span className={cn('flex size-6 items-center justify-center rounded-full', i < current ? 'bg-good-soft text-good' : i === current ? 'bg-brand-soft text-brand' : 'bg-surface-2')}>
              {i < current ? <Check className="size-3.5" /> : i === current ? <Loader2 className="size-3.5 animate-spin" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- OTP ----------
export function OtpInput({ value, onChange, length = 6, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  return (
    <div className="flex justify-center gap-2" onPaste={(e) => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted) {
        e.preventDefault();
        onChange(pasted);
        refs.current[Math.min(pasted.length, length - 1)]?.focus();
      }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
          }}
          className="size-12 rounded-tile bg-surface-2 text-center text-xl font-semibold text-text outline-none focus:bg-surface focus:ring-2 focus:ring-brand/30"
        />
      ))}
    </div>
  );
}

// ---------- Fake file upload ----------
/** Looks like an upload; just records the chosen file names. */
export function FileDrop({ label, hint, files, onChange, accept, multiple }: { label: string; hint?: string; files: string[]; onChange: (names: string[]) => void; accept?: string; multiple?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-tile border-2 border-dashed border-border bg-surface-2/50 px-4 py-6 text-center transition hover:border-brand/60">
        <UploadCloud className="size-6 text-brand" />
        <span className="text-sm font-medium text-text">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        <input
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            if (names.length) onChange(multiple ? [...files, ...names] : names);
          }}
        />
      </label>
      {files.map((f) => (
        <div key={f} className="flex items-center gap-2 rounded-tile bg-good-soft px-3 py-2 text-sm text-good">
          <FileCheck2 className="size-4" />
          <span className="flex-1 truncate">{f}</span>
          <button type="button" onClick={() => onChange(files.filter((x) => x !== f))} aria-label={`Remove ${f}`}>
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Copy to clipboard ----------
export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface-2 p-1.5 pl-4">
      <span className="flex-1 truncate font-mono text-sm text-text">{value}</span>
      <button
        type="button"
        className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-on-brand"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
