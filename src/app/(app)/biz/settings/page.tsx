'use client';

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { BillingStep, BusinessDocsStep, BusinessLabelBadge, CapabilityPicker, ReadinessBanner, type DocsStage } from '@/components/shared/Business';
import { PayoutStep, payoutAccountFrom, type PayoutDraft } from '@/components/shared/SellerSteps';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, DefinitionList, PageHeader } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { VENUE_TYPE, type BusinessCapability, type VenueType } from '@/lib/constants/enums';
import { CAPABILITY_LABEL, PAYOUT_METHOD_LABEL, PAYOUT_SCHEDULE_LABEL, PRESET_LABEL, VENUE_TYPE_LABEL } from '@/lib/constants/labels';
import { normalizeKenyanPhone } from '@/lib/format';
import { BUSINESS_LABEL_TEXT, displayLabel, hasSellSide } from '@/lib/selectors';
import { setBilling, setBusinessPayout, setCapabilities, updateBusiness, verifyBusiness } from '@/lib/store/actions/business';
import { useViewer } from '@/lib/store/hooks';
import type { BillingAccount, BusinessAccount, Person } from '@/types';

export default function BusinessSettings() {
  const { me, business } = useViewer();
  const b = business!;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Business settings" subtitle={<span className="flex items-center gap-2"><BusinessLabelBadge business={b} /> {b.name}</span>} />
      <ReadinessBanner business={b} />
      {/* Keyed so the forms reset when switching between businesses. */}
      <DetailsCard key={`d-${b.id}`} b={b} />
      <CapabilitiesCard key={`c-${b.id}`} b={b} />
      <VerificationCard key={`v-${b.id}`} b={b} me={me} />
    </div>
  );
}

function DetailsCard({ b }: { b: BusinessAccount }) {
  const [name, setName] = useState(b.name);
  const [address, setAddress] = useState(b.address);
  const [regTaxId, setRegTaxId] = useState(b.regTaxId);
  const [venueType, setVenueType] = useState<VenueType | 'NONE'>(b.venueType ?? 'NONE');
  const [contactName, setContactName] = useState(b.contactName);
  const [contactPhone, setContactPhone] = useState(b.contactPhone);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Details & team contact" />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const phone = normalizeKenyanPhone(contactPhone);
          if (!name.trim() || !address.trim()) return setError('Name and address are required.');
          if (!phone) return setError('Enter a valid Kenyan contact number.');
          setError(null);
          updateBusiness(b.id, { name: name.trim(), address: address.trim(), regTaxId: regTaxId.trim(), venueType: venueType === 'NONE' ? undefined : venueType, contactName: contactName.trim(), contactPhone: phone });
          toast('Business details saved');
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Physical venue">
            <Select<VenueType | 'NONE'> value={venueType} onChange={setVenueType} options={[{ value: 'NONE', label: 'No physical venue' }, ...VENUE_TYPE.map((v) => ({ value: v, label: VENUE_TYPE_LABEL[v] }))]} />
          </Field>
          <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="Registration no. / KRA PIN"><Input value={regTaxId} onChange={(e) => setRegTaxId(e.target.value.toUpperCase())} /></Field>
          <Field label="Contact person"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
          <Field label="Contact phone"><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
        </div>
        {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
        <Button type="submit" className="self-start">Save details</Button>
      </form>
    </Card>
  );
}

function CapabilitiesCard({ b }: { b: BusinessAccount }) {
  const [caps, setCaps] = useState<BusinessCapability[]>(b.capabilities);
  const dirty = caps.length !== b.capabilities.length || caps.some((c) => !b.capabilities.includes(c));
  const preview = BUSINESS_LABEL_TEXT[displayLabel({ capabilities: caps, venueType: b.venueType })];
  return (
    <Card>
      <div id="capabilities" className="scroll-mt-20" />
      <CardHeader title="Capabilities" subtitle={`Started from the ${PRESET_LABEL[b.preset]} preset. Turn tools on or off any time; your data is kept.`} />
      <CapabilityPicker value={caps} onChange={setCaps} />
      {dirty && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
          <span className="text-muted">
            You’ll show as <span className="font-semibold text-text">{preview}</span>
            {hasSellSide(caps) && !hasSellSide(b.capabilities) && '. Selling needs verification and a payout account below.'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCaps(b.capabilities)}>Undo</Button>
            <Button size="sm" onClick={() => { setCapabilities(b.id, caps); toast(`Dashboard updated: ${caps.map((c) => CAPABILITY_LABEL[c]).join(', ') || 'no capabilities'}`); }}>Save capabilities</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function VerificationCard({ b, me }: { b: BusinessAccount; me: Person }) {
  const [docs, setDocs] = useState<DocsStage>('form');
  const [editPayout, setEditPayout] = useState(false);
  const [payout, setPayout] = useState<PayoutDraft>({ method: 'BANK', account: '', verified: false });
  const [billing, setBillingDraft] = useState<BillingAccount>(b.billing ?? { mode: 'PREPAID_WALLET', email: me.email ?? '' });
  const billingDirty = billing.mode !== b.billing?.mode || billing.email !== b.billing?.email;

  return (
    <Card>
      <div id="verification" className="scroll-mt-20" />
      <CardHeader title="Verification, payouts & billing" />
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text">Business verification</h3>
          {b.verified ? (
            <div className="flex items-center gap-2 text-sm font-medium text-good"><BadgeCheck className="size-4" /> Verified business</div>
          ) : (
            <>
              <p className="text-sm text-muted">Required to sell. Also unlocks large ad campaigns.</p>
              <BusinessDocsStep
                stage={docs}
                name={b.name}
                onStage={(s) => {
                  setDocs(s);
                  if (s === 'done') verifyBusiness(b.id);
                }}
              />
            </>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text">Payout account</h3>
          {editPayout ? (
            <>
              <PayoutStep me={me} value={payout} onChange={setPayout} />
              <div className="flex gap-2">
                <Button disabled={!payout.verified} onClick={() => { setBusinessPayout(b.id, payoutAccountFrom(payout)); setEditPayout(false); toast('Payout account saved'); }}>Save payout account</Button>
                <Button variant="ghost" onClick={() => setEditPayout(false)}>Cancel</Button>
              </div>
            </>
          ) : b.payout ? (
            <>
              <DefinitionList items={[['Method', PAYOUT_METHOD_LABEL[b.payout.method]], ['Account', `${b.payout.bankName ? `${b.payout.bankName} ` : ''}${b.payout.account}`], ['Schedule', PAYOUT_SCHEDULE_LABEL[b.payout.schedule]]]} />
              <Button variant="outline" size="sm" className="self-start" onClick={() => setEditPayout(true)}>Change</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{hasSellSide(b.capabilities) ? 'Required to receive money from sales.' : 'Only needed if you start selling.'}</p>
              <Button variant="secondary" className="self-start" onClick={() => setEditPayout(true)}>Add payout account</Button>
            </>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text">Billing</h3>
          <BillingStep value={billing} onChange={setBillingDraft} />
          {billingDirty && (
            <Button className="self-start" disabled={!/^\S+@\S+\.\S+$/.test(billing.email)} onClick={() => { setBilling(b.id, billing); toast('Billing saved'); }}>
              Save billing
            </Button>
          )}
        </section>
      </div>
    </Card>
  );
}
