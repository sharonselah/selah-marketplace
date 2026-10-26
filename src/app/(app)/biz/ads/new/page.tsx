'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { PaymentMethodPicker, PaymentProcessing, paymentBlocked } from '@/components/shared/Payment';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, DefinitionList, EmptyState, Money, PageHeader } from '@/components/ui/Display';
import { Field, Input, OptionCard } from '@/components/ui/Field';
import { FileDrop, ProcessingSteps, Stepper } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import type { PaymentMethod } from '@/lib/constants/enums';
import { formatCount, formatDate, formatKES } from '@/lib/format';
import { byId, walletOf } from '@/lib/selectors';
import { adSpendError, createAdCampaign, quoteAdCampaign, type AdPayMethod } from '@/lib/store/actions/ads';
import { useViewer } from '@/lib/store/hooks';
import type { AdCampaign, InventoryId } from '@/types';

const STEPS = ['Screens', 'Dates', 'Creative', 'Pay'] as const;
const dayStr = (offset: number) => new Date(Date.now() + offset * 86400_000).toISOString().slice(0, 10);

export default function AdCampaignBuilder() {
  const { world, me, actingAs, business } = useViewer();
  const b = business!;
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get('slots') ?? '').split(',').filter(Boolean) as InventoryId[];
  const [step, setStep] = useState(0);
  const [removed, setRemoved] = useState<InventoryId[]>([]);
  const [name, setName] = useState('');
  const [start, setStart] = useState(dayStr(1));
  const [end, setEnd] = useState(dayStr(8));
  const [files, setFiles] = useState<string[]>([]);
  const [method, setMethod] = useState<AdPayMethod>(b.billing?.mode === 'INVOICED' ? 'INVOICE' : 'WALLET');
  const [stage, setStage] = useState<'form' | 'paying'>('form');
  const [error, setError] = useState<string | null>(null);

  const ids = initial.filter((id, i) => initial.indexOf(id) === i && !removed.includes(id));
  const startISO = new Date(`${start}T18:00`).toISOString();
  const endISO = new Date(`${end}T23:59`).toISOString();
  const quote = quoteAdCampaign(world, ids, startISO, endISO);
  const balance = walletOf(world, actingAs);

  if (!initial.length) {
    return <EmptyState title="Pick some screens first" body="Choose slots in the ad marketplace, then build your campaign." action={<LinkButton href="/biz/ads">Open ad marketplace</LinkButton>} />;
  }

  const validate = (): string | null => {
    if (step === 0) return quote.slots.length ? null : 'Keep at least one screen.';
    if (step === 1) {
      if (!name.trim()) return 'Name your campaign.';
      return end > start ? null : 'The end date must be after the start date.';
    }
    if (step === 2) return files.length ? null : 'Upload at least one image or video.';
    if (step === 3) return adSpendError(world, b, quote.total) ?? (method === 'INVOICE' ? null : paymentBlocked(method, quote.total, balance));
    return null;
  };
  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    if (step === STEPS.length - 1) setStage('paying');
    else setStep(step + 1);
  };
  const create = () => {
    const creative: AdCampaign['creative'] = files.map((f) => ({ kind: /\.(mp4|mov|webm)$/i.test(f) ? 'VIDEO' : 'IMAGE', name: f }));
    const id = createAdCampaign(b.id, { name: name.trim(), slotIds: ids, startDate: startISO, endDate: endISO, creative, method });
    toast('Campaign booked. It goes live shortly.');
    router.replace(`/biz/ads/campaigns/${id}`);
  };

  if (stage === 'paying') {
    return (
      <Card className="mx-auto mt-6 max-w-md">
        {method === 'INVOICE' ? (
          <ProcessingSteps title="Booking on invoice" done="Campaign booked" steps={['Reserving your screens', `Raising invoice to ${b.billing?.email}`, 'Securing venue payments in escrow']} onDone={create} />
        ) : (
          <PaymentProcessing method={method} amount={quote.total} phone={me.phone} onDone={create} />
        )}
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={<BackLink href="/biz/ads" label="Ad marketplace" />} title="New ad campaign" />
      <Stepper steps={STEPS} current={step} />
      <Card className="mt-6">
        {step === 0 && (
          <div className="flex flex-col gap-1">
            <h2 className="pb-2 text-heading text-text">Your screens</h2>
            {quote.slots.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{byId(world.businesses, s.venueId)?.name} · {s.name}</div>
                  <div className="text-xs text-muted">{s.screen} · ~{formatCount(s.reachEstimate)} / night</div>
                </div>
                <Money amount={s.price} className="text-sm font-semibold text-text" />
                <button className="text-muted hover:text-bad" aria-label={`Remove ${s.name}`} onClick={() => setRemoved([...removed, s.id])}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Name & dates</h2>
            <Field label="Campaign name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend screens: new flavour" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First night"><Input type="date" min={dayStr(0)} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="Last night"><Input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            <p className="text-sm text-muted">{quote.days} nights · estimated reach {formatCount(quote.reach)} · {formatKES(quote.total)}</p>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Creative</h2>
            <p className="text-sm text-muted">Landscape 16:9. Videos up to {Math.max(...quote.slots.map((s) => s.slotLengthSec))} seconds, no audio (screens play muted).</p>
            <FileDrop label="Upload image or video" hint="JPG, PNG, MP4 (prototype: files aren’t really uploaded)" files={files} onChange={setFiles} multiple accept="image/*,video/*" />
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Review & pay</h2>
            <DefinitionList
              items={[
                ['Campaign', name],
                ['Run', `${formatDate(startISO)} – ${formatDate(endISO)} (${quote.days} nights)`],
                ['Screens', `${quote.slots.length} at ${quote.byVenue.size} venue${quote.byVenue.size > 1 ? 's' : ''}`],
                ['Estimated reach', formatCount(quote.reach)],
                ['Creative', files.join(', ')],
                ['Total', <Money key="t" amount={quote.total} className="text-base" />],
              ]}
            />
            <p className="text-xs text-muted">Each venue’s share is held in escrow and released when the run completes.</p>
            {b.billing?.mode === 'INVOICED' && (
              <OptionCard selected={method === 'INVOICE'} onClick={() => setMethod('INVOICE')} icon={<FileText className="size-5" />} title="Add to monthly invoice" description={`Net 30, sent to ${b.billing.email}`} />
            )}
            {/* While "invoice" is chosen, none of the payment rails shows as selected. */}
            <PaymentMethodPicker value={method as PaymentMethod} onChange={setMethod} walletBalance={balance} amount={quote.total} />
          </div>
        )}
        {error && <div className="mt-4 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
        <div className="mt-6 flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => { setError(null); setStep(step - 1); }}>Back</Button>
          <Button onClick={next}>{step === STEPS.length - 1 ? `Pay ${formatKES(quote.total)}` : 'Continue'}</Button>
        </div>
      </Card>
    </div>
  );
}
