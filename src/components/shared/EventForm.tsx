'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Cover } from '@/components/ui/Display';
import { eventPhoto } from '@/lib/data/photos';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { COVER_COUNT, GENRES } from '@/lib/data/pools';
import type { SelahEvent } from '@/types';

export type EventInput = Pick<SelahEvent, 'title' | 'description' | 'date' | 'genres' | 'cover'>;

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function EventForm({ initial, submitLabel, onSubmit }: { initial?: SelahEvent; submitLabel: string; onSubmit: (input: EventInput) => void }) {
  const start = initial ? new Date(initial.date) : undefined;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(start ? localDate(start) : '');
  const [time, setTime] = useState(start ? localTime(start) : '21:00');
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [cover, setCover] = useState(initial?.cover ?? 'g0');
  const [error, setError] = useState<string | null>(null);
  const today = localDate(new Date());

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim().length < 3) return setError('Give the event a name.');
        if (!date) return setError('Pick a date.');
        if (!genres.length) return setError('Pick at least one genre so the right people find it.');
        setError(null);
        onSubmit({ title: title.trim(), description: description.trim() || `${genres.join(' & ')} night.`, date: new Date(`${date}T${time}`).toISOString(), genres, cover });
      }}
    >
      <Field label="Event name">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Amapiano Fridays" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" min={initial ? undefined : today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Doors open">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lineup, dress code, age limit, what to expect" />
      </Field>
      <Field label="Genres">
        <ChipSelect options={GENRES} value={genres} onChange={setGenres} max={4} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Cover</span>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: COVER_COUNT }, (_, i) => `g${i}`).map((c) => (
            <button key={c} type="button" aria-label={`Cover ${c}`} aria-pressed={cover === c} onClick={() => setCover(c)} className={cn('rounded-tile ring-offset-2 ring-offset-surface', cover === c && 'ring-2 ring-brand')}>
              <Cover cover={c} photo={eventPhoto(c)} className="flex size-12 items-center justify-center rounded-tile text-white">{cover === c && <Check className="size-5" />}</Cover>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button type="submit" className="self-start">{submitLabel}</Button>
    </form>
  );
}
