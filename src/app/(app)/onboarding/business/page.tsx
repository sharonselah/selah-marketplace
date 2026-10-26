'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BillingStep, BusinessDocsStep, CapabilityPicker, PresetGrid, type DocsStage } from '@/components/shared/Business';
import { BackLink } from '@/components/shared/Cards';
import { PayoutStep, payoutAccountFrom, type PayoutDraft } from '@/components/shared/SellerSteps';
import { Button } from '@/components/ui/Button';
import { Card, DefinitionList, PageHeader } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { ProcessingSteps, Stepper } from '@/components/ui/Interactive';
import { VENUE_TYPE, type BusinessCapability, type VenueType } from '@/lib/constants/enums';
import { CAPABILITY_LABEL, PAYOUT_METHOD_LABEL, VENUE_TYPE_LABEL } from '@/lib/constants/labels';
import { BUSINESS_PRESETS, type BusinessPreset } from '@/lib/constants/panels';
import { normalizeKenyanPhone } from '@/lib/format';
import { BUSINESS_LABEL_TEXT, displayLabel, hasSellSide } from '@/lib/selectors';
import { createBusiness } from '@/lib/store/actions/business';
import { useViewer } from '@/lib/store/hooks';
import type { BillingAccount } from '@/types';

const STEPS = ['Details', 'Type', 'Capabilities', 'Verification', 'Review'] as const;

export default function BusinessOnboarding() {
  const { me } = useViewer();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [venueType, setVenueType] = useState<VenueType | 'NONE'>('NONE');
  const [regTaxId, setRegTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState(me.name);
  const [contactPhone, setContactPhone] = useState(me.phone);
  const [preset, setPreset] = useState<BusinessPreset | null>(null);
  const [caps, setCaps] = useState<BusinessCapability[]>([]);
  const [docs, setDocs] = useState<DocsStage>('form');
  const [payout, setPayout] = useState<PayoutDraft>({ method: 'BANK', account: '', verified: false });
  const [billing, setBilling] = useState<BillingAccount>({ mode: 'PREPAID_WALLET', email: me.email ?? '' });
  const [publishing, setPublishing] = useState(false);

  const sellSide = hasSellSide(caps);
  const buySide = caps.some((c) => c !== 'SELL_VENUE_INVENTORY');
  // Presets are shortcuts: picking one pre-fills the flags, which stay editable (Guardrail 4).
  const capsMatchPreset = preset !== null && preset !== 'CUSTOM' && caps.length === BUSINESS_PRESETS[preset].length && caps.every((c) => (BUSINESS_PRESETS[preset] as readonly BusinessCapability[]).includes(c));
  const draft = { capabilities: caps, venueType: venueType === 'NONE' ? undefined : venueType };

  const validate = (): string | null => {
    switch (step) {
      case 0:
        if (name.trim().length < 2) return 'Add your business name.';
        if (!regTaxId.trim()) return 'Add your registration number or KRA PIN.';
        if (!address.trim()) return 'Add your address.';
        return normalizeKenyanPhone(contactPhone) ? null : 'Enter a valid Kenyan contact number.';
      case 1:
        return preset ? null : 'Pick the option closest to your business. You can fine-tune next.';
      case 2:
        return caps.length ? null : 'Turn on at least one capability.';
      case 3:
        if (sellSide && docs !== 'done') return 'Selling needs a verified business. Upload your documents.';
        if (sellSide && !payout.verified) return 'Selling needs a verified payout account.';
        if (buySide && !/^\S+@\S+\.\S+$/.test(billing.email)) return 'Add a billing email.';
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setStep((s) => s + 1);
  };

  if (publishing) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <ProcessingSteps
          title={`Setting up ${name}`}
          done="You’re live!"
          steps={['Creating your business account', 'Building your dashboard from your capabilities', sellSide ? 'Listing you in Discover' : 'Activating your billing account']}
          onDone={() => {
            createBusiness(me.id, {
              name: name.trim(),
              regTaxId: regTaxId.trim(),
              address: address.trim(),
              contactName: contactName.trim(),
              contactPhone: normalizeKenyanPhone(contactPhone)!,
              venueType: draft.venueType,
              preset: capsMatchPreset ? preset! : 'CUSTOM',
              capabilities: caps,
              verified: docs === 'done',
              payout: sellSide ? payoutAccountFrom(payout) : undefined,
              billing: buySide ? billing : undefined,
            });
            router.replace('/biz?welcome=1');
          }}
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={<BackLink href="/sell" label="Start selling" />} title="Add Business Account" subtitle="For clubs, bars, organisers and brands. One account, any mix of capabilities." />
      <Stepper steps={STEPS} current={step} />

      <Card className="mt-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">About your business</h2>
            <Field label="Business name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kiza Lounge" />
            </Field>
            <Field label="Physical venue" hint="Clubs, bars and lounges show as a Venue. Without a venue you’re listed as an Organiser or Brand.">
              <Select<VenueType | 'NONE'> value={venueType} onChange={setVenueType} options={[{ value: 'NONE', label: 'No physical venue' }, ...VENUE_TYPE.map((v) => ({ value: v, label: VENUE_TYPE_LABEL[v] }))]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration no. / KRA PIN">
                <Input value={regTaxId} onChange={(e) => setRegTaxId(e.target.value.toUpperCase())} placeholder="P051234567X" />
              </Field>
              <Field label="Address">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, town" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person">
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </Field>
              <Field label="Contact phone">
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">What best describes you?</h2>
            <p className="text-sm text-muted">A starting point only. You’ll pick the exact capabilities next.</p>
            <PresetGrid
              value={preset}
              onChange={(p) => {
                setPreset(p);
                setCaps([...BUSINESS_PRESETS[p]]);
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Customise capabilities</h2>
            <p className="text-sm text-muted">Each one adds its own tools to your dashboard. A club can sell tables, book DJs, buy ads and run creator campaigns all at once.</p>
            <CapabilityPicker value={caps} onChange={setCaps} />
            {caps.length > 0 && (
              <p className="text-sm text-muted">
                You’ll show as <span className="font-semibold text-text">{BUSINESS_LABEL_TEXT[displayLabel(draft)]}</span>.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            {sellSide && (
              <section className="flex flex-col gap-3">
                <h2 className="text-heading text-text">Verify your business</h2>
                <p className="text-sm text-muted">Selling needs verified documents so buyers know their money is safe.</p>
                <BusinessDocsStep stage={docs} onStage={setDocs} name={name} />
              </section>
            )}
            {sellSide && <PayoutStep me={me} value={payout} onChange={setPayout} />}
            {buySide && (
              <section className="flex flex-col gap-3">
                <h2 className="text-heading text-text">How will you pay?</h2>
                <BillingStep value={billing} onChange={setBilling} />
              </section>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Review & go live</h2>
            <DefinitionList
              items={[
                ['Name', name],
                ['Shows as', BUSINESS_LABEL_TEXT[displayLabel(draft)]],
                ['Venue type', venueType === 'NONE' ? 'No physical venue' : VENUE_TYPE_LABEL[venueType]],
                ['Address', address],
                ['Capabilities', caps.map((c) => CAPABILITY_LABEL[c]).join(', ')],
                ...(sellSide ? ([['Verification', docs === 'done' ? 'Verified' : 'Pending'], ['Payout', `${PAYOUT_METHOD_LABEL[payout.method]} · ${payout.account}`]] as [string, string][]) : []),
                ...(buySide ? ([['Billing', `${billing.mode === 'INVOICED' ? 'Monthly invoice' : 'Prepaid wallet'} · ${billing.email}`]] as [string, string][]) : []),
              ]}
            />
          </div>
        )}

        {error && <div className="mt-4 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="mt-6 flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => { setError(null); setStep((s) => s - 1); }}>
            Back
          </Button>
          {step < STEPS.length - 1 ? <Button onClick={next}>Continue</Button> : <Button onClick={() => setPublishing(true)}>Go live</Button>}
        </div>
      </Card>
    </div>
  );
}
