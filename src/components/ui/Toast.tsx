'use client';

import { useSyncExternalStore } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'good' | 'info' | 'bad';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const EMPTY: ToastItem[] = [];

export function toast(message: string, tone: ToastTone = 'good') {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

export function Toaster() {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
  const Icon = { good: CheckCircle2, info: Info, bad: XCircle };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => {
        const I = Icon[t.tone];
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-text px-5 py-3 text-sm text-bg shadow-float">
            <I className={cn('size-4 shrink-0', t.tone === 'good' && 'text-good', t.tone === 'bad' && 'text-bad', t.tone === 'info' && 'text-info')} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
