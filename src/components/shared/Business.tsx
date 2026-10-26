'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, BadgeCheck, Building2, CalendarHeart, FileCheck2, Megaphone, MonitorPlay, Mic2, Sparkles, Store, Wallet, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/Display';
import { Field, Input, OptionCard } from '@/components/ui/Field';
import { FileDrop, ProcessingSteps } from '@/components/ui/Interactive';
import { Button } from '@/components/ui/Button';
import { BUSINESS_CAPABILITY, type BusinessCapability } from '@/lib/constants/enums';
import { CAPABILITY_DESCRIPTION, CAPABILITY_LABEL } from '@/lib/constants/labels';
import { BUSINESS_PRESET_BLURB, BUSINESS_PRESETS, type BusinessPreset } from '@/lib/constants/panels';
import { PRESET_LABEL } from '@/lib/constants/labels';
import { BUSINESS_LABEL_TEXT, displayLabel, readiness } from '@/lib/selectors';
import type { BillingAccount, BusinessAccount } from '@/types';

export const CAPABILITY_ICON: Record<BusinessCapability, typeof Store> = {
  SELL_VENUE_INVENTORY: Store,
  BUY_ARTIST_BOOKINGS: Mic2,
  BUY_AD_INVENTORY: MonitorPlay,
  COMMISSION_CREATOR_JOBS: Megaphone,
};

const PRESET_ICON: Record<BusinessPreset, typeof Store> = {
  VENUE: Building2,
  ORGANISER: CalendarHeart,
  BRAND: Sparkles,
  CUSTOM: Wand2,
};

export function PresetGrid({ value, onChange }: { value: BusinessPreset | null; onChange: (p: BusinessPreset) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(BUSINESS_PRESETS) as BusinessPreset[]).map((p) => {
        const Icon = PRESET_ICON[p];
        return (
          <OptionCard
            key={p}
            selected={value === p}
            onClick={() => onChange(p)}
            icon={<Icon className="size-5" />}
            title={PRESET_LABEL[p]}
            description={
              <>
                {BUSINESS_PRESET_BLURB[p]}
                {BUSINESS_PRESETS[p].length > 0 && <span className="mt-1 block text-[11px] text-muted">{BUSINESS_PRESETS[p].map((c) => CAPABILITY_LABEL[c]).join(' · ')}</span>}
              </>
            }
          />
        );
      })}
    </div>
  );
}

export function CapabilityPicker({ value, onChange }: { value: BusinessCapability[]; onChange: (v: BusinessCapability[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {BUSINESS_CAPABILITY.map((c) => {
        const Icon = CAPABILITY_ICON[c];
        const on = value.includes(c);
        return (
          <OptionCard
            key={c}
            selected={on}
            onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
            icon={<Icon className="size-5" />}
            title={CAPABILITY_LABEL[c]}
            description={CAPABILITY_DESCRIPTION[c]}
            badge={c === 'SELL_VENUE_INVENTORY' ? <Badge tone="warn">Sell-side</Badge> : <Badge>Buy-side</Badge>}
          />
        );
      })}
    </div>
  );
}

export type DocsStage = 'form' | 'reviewing' | 'done';

/** Facade business verification: documents → "Under review" → verified. */
export function BusinessDocsStep({ stage, onStage, name }: { stage: DocsStage; onStage: (s: DocsStage) => void; name: string }) {
  const [cert, setCert] = useState<string[]>([]);
  const [kra, setKra] = useState<string[]>([]);
  const [director, setDirector] = useState<string[]>([]);
  if (stage === 'reviewing') {
    return (
      <ProcessingSteps
        title="Under review"
        done="Business verified"
        steps={['Uploading documents', 'Checking registration with the Business Registration Service', 'Validating KRA PIN', 'Matching director ID']}
        stepMs={1200}
        onDone={() => onStage('done')}
      />
    );
  }
  if (stage === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-good">
        <BadgeCheck className="size-5" /> {name || 'Your business'} is verified
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <FileDrop label="Certificate of registration / CR12" hint="PDF or photo" files={cert} onChange={setCert} />
      <FileDrop label="KRA PIN certificate" files={kra} onChange={setKra} />
      <FileDrop label="Director’s national ID" files={director} onChange={setDirector} />
      <Button className="self-start" icon={<FileCheck2 className="size-4" />} disabled={!cert.length || !kra.length || !director.length} onClick={() => onStage('reviewing')}>
        Submit for review
      </Button>
    </div>
  );
}

export function BillingStep({ value, onChange }: { value: BillingAccount; onChange: (v: BillingAccount) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <OptionCard selected={value.mode === 'PREPAID_WALLET'} onClick={() => onChange({ ...value, mode: 'PREPAID_WALLET' })} icon={<Wallet className="size-5" />} title="Prepaid wallet" description="Top up with M-Pesa or card and spend from your business wallet." />
        <OptionCard selected={value.mode === 'INVOICED'} onClick={() => onChange({ ...value, mode: 'INVOICED' })} icon={<FileCheck2 className="size-5" />} title="Monthly invoice" description="Ad campaigns are billed on net-30 terms to your accounts team." />
      </div>
      <Field label="Billing email" hint="Receipts and invoices go here.">
        <Input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} placeholder="accounts@yourbusiness.co.ke" />
      </Field>
    </div>
  );
}

export function BusinessLabelBadge({ business }: { business: BusinessAccount }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone="brand">{BUSINESS_LABEL_TEXT[displayLabel(business)]}</Badge>
      {business.verified && <Badge tone="good"><BadgeCheck className="size-3" /> Verified</Badge>}
    </span>
  );
}

/** Guardrail 3 surfaced: what's still missing before this business can sell or buy. */
export function ReadinessBanner({ business }: { business: BusinessAccount }) {
  const { ready, missing } = readiness(business);
  if (ready) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-tile bg-warn-soft p-4 text-sm text-warn">
      <AlertTriangle className="size-5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">Finish setup to go live</div>
        <div>Missing: {missing.join(', ')}.</div>
      </div>
      <Link href="/biz/settings#verification" className="font-medium underline">Complete setup</Link>
    </div>
  );
}
