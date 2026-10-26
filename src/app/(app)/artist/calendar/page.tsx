'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, PageHeader } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { cn } from '@/lib/cn';
import type { AvailabilityStatus } from '@/lib/constants/enums';
import { AVAILABILITY_TONE, humanize } from '@/lib/constants/labels';
import { byId } from '@/lib/selectors';
import { setAvailability } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { AvailabilityBlock } from '@/types';

const DOT: Record<AvailabilityStatus, string> = { AVAILABLE: 'bg-good', BOOKED: 'bg-brand', BLOCKED: 'bg-muted', TENTATIVE: 'bg-warn' };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarPage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const blocks = world.availability.filter((a) => a.artistId === artist.id);
  const blocksOn = (day: string) => blocks.filter((b) => b.date.slice(0, 10) === day || ymd(new Date(b.date)) === day);
  const selectedBlocks: AvailabilityBlock[] = selected ? blocksOn(selected) : [];
  const booked = selectedBlocks.find((b) => b.bookingId);

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your bookings and availability. Block dates so buyers know when you’re unavailable." />
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setOffset(offset - 1)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
          <div className="font-semibold text-text">{first.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</div>
          <Button variant="ghost" size="sm" onClick={() => setOffset(offset + 1)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(first.getFullYear(), first.getMonth(), i + 1);
            const day = ymd(date);
            const bs = blocksOn(day);
            const isToday = day === ymd(today);
            const past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <button
                key={day}
                disabled={past}
                onClick={() => { setSelected(day); setNote(''); }}
                className={cn('flex aspect-square flex-col items-center justify-start gap-1 rounded-tile bg-surface-2 p-1.5 text-sm transition disabled:opacity-40 md:aspect-auto md:h-20', isToday && 'ring-2 ring-brand', 'hover:bg-brand-soft')}
              >
                <span className={cn('text-text', isToday && 'font-bold text-brand')}>{i + 1}</span>
                <span className="flex gap-0.5">
                  {bs.map((b, k) => <span key={k} className={cn('size-1.5 rounded-full', DOT[b.status])} />)}
                </span>
                {bs[0] && <span className="hidden w-full truncate text-[10px] text-muted md:block">{bs[0].note ?? humanize(bs[0].status)}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          {(Object.keys(DOT) as AvailabilityStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className={cn('size-2 rounded-full', DOT[s])} /> {humanize(s)}</span>
          ))}
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? new Date(selected).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {booked ? (
          <div className="flex flex-col gap-3">
            <Badge tone={AVAILABILITY_TONE[booked.status]}>{humanize(booked.status)}</Badge>
            <p className="text-sm text-text">{booked.note ?? byId(world.bookings, booked.bookingId)?.eventName}</p>
            <Link href={`/artist/gigs/${byId(world.bookings, booked.bookingId)?.requestId}`} className="text-sm font-medium text-brand hover:underline">Open booking →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {selectedBlocks[0] && <p className="text-sm text-muted">Currently: <span className="font-medium text-text">{humanize(selectedBlocks[0].status)}</span>{selectedBlocks[0].note ? ` (${selectedBlocks[0].note})` : ''}</p>}
            <Field label="Note (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Family wedding" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {(['AVAILABLE', 'TENTATIVE', 'BLOCKED'] as const).map((s) => (
                <Button
                  key={s}
                  variant={s === 'AVAILABLE' ? 'outline' : s === 'BLOCKED' ? 'secondary' : 'outline'}
                  onClick={() => {
                    setAvailability(artist.id, new Date(`${selected}T12:00:00`).toISOString(), s, note.trim() || undefined);
                    setSelected(null);
                  }}
                >
                  {s === 'AVAILABLE' ? 'Available' : humanize(s)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
