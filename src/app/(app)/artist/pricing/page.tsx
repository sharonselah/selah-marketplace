'use client';

import { useState } from 'react';
import { PayoutPreview } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Display';
import { Field, Input, OptionCard } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { kes } from '@/lib/format';
import { personRef } from '@/lib/selectors';
import { updatePricing } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';

export default function PricingPage() {
  const { me } = useViewer();
  const a = me.artist!;
  const b = a.pricing.booking;
  const [kind, setKind] = useState<'FIXED' | 'RANGE'>(b.kind);
  const [min, setMin] = useState(String((b.kind === 'FIXED' ? b.amount : b.min) / 100));
  const [max, setMax] = useState(String((b.kind === 'RANGE' ? b.max : b.amount * 2) / 100));
  const [song, setSong] = useState(String(a.pricing.songRequest / 100));
  const [shout, setShout] = useState(String(a.pricing.shoutOut / 100));
  const [error, setError] = useState<string | null>(null);
  const digits = (v: string) => v.replace(/\D/g, '');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pricing" subtitle="What buyers see on your profile. Requests below your minimum get an automatic counter-offer." />
      <Card>
        <CardHeader title="Booking rate" />
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <OptionCard selected={kind === 'FIXED'} onClick={() => setKind('FIXED')} title="Fixed" />
            <OptionCard selected={kind === 'RANGE'} onClick={() => setKind('RANGE')} title="Range" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={kind === 'FIXED' ? 'Rate (KES)' : 'Minimum (KES)'}>
              <Input inputMode="numeric" value={min} onChange={(e) => setMin(digits(e.target.value))} />
            </Field>
            {kind === 'RANGE' && (
              <Field label="Maximum (KES)">
                <Input inputMode="numeric" value={max} onChange={(e) => setMax(digits(e.target.value))} />
              </Field>
            )}
          </div>
          <PayoutPreview amount={kes(Number(min) || 0)} payee={personRef(me.id)} />
        </div>
      </Card>
      <Card className="mt-4">
        <CardHeader title="Live requests" subtitle="Charged when patrons request a song or shout-out during your set." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Song request (KES)">
            <Input inputMode="numeric" value={song} onChange={(e) => setSong(digits(e.target.value))} />
          </Field>
          <Field label="Shout-out (KES)">
            <Input inputMode="numeric" value={shout} onChange={(e) => setShout(digits(e.target.value))} />
          </Field>
        </div>
      </Card>
      {error && <div className="mt-4 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
      <Button
        className="mt-4"
        onClick={() => {
          if (!Number(min)) return setError('Set a booking rate.');
          if (kind === 'RANGE' && Number(max) <= Number(min)) return setError('Maximum must be higher than minimum.');
          setError(null);
          updatePricing(a.id, {
            booking: kind === 'FIXED' ? { kind: 'FIXED', amount: kes(Number(min)) } : { kind: 'RANGE', min: kes(Number(min)), max: kes(Number(max)) },
            songRequest: kes(Number(song)),
            shoutOut: kes(Number(shout)),
          });
          toast('Rates updated');
        }}
      >
        Save rates
      </Button>
    </div>
  );
}
