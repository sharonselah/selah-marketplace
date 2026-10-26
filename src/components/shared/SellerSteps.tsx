'use client';

import { useState } from 'react';
import { Camera, Check, IdCard, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, OptionCard } from '@/components/ui/Field';
import { FileDrop, ProcessingSteps } from '@/components/ui/Interactive';
import { PayMark } from '@/components/ui/Visuals';
import type { PayoutMethod } from '@/lib/constants/enums';
import { PAYOUT_METHOD_LABEL } from '@/lib/constants/labels';
import { formatKES, kes } from '@/lib/format';
import type { Person } from '@/types';

// Seller onboarding steps shared by the Artist and Creator wizards (sell-side needs payout + ID).

export interface PayoutDraft {
  method: PayoutMethod;
  account: string;
  verified: boolean;
}

export function PayoutStep({ me, value, onChange }: { me: Person; value: PayoutDraft; onChange: (v: PayoutDraft) => void }) {
  const [verifying, setVerifying] = useState(false);
  const { method, account, verified } = value;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-heading text-text">Where should we pay you?</h2>
      {verifying ? (
        <ProcessingSteps
          title="Verifying payout account"
          done="Payout account verified"
          steps={method === 'MPESA' ? ['Checking M-Pesa registration', `Confirming the name matches ${me.name}`] : ['Validating account number', 'Confirming account holder']}
          onDone={() => {
            setVerifying(false);
            onChange({ ...value, verified: true });
          }}
        />
      ) : verified ? (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-good">
          <Check className="size-4" /> {PAYOUT_METHOD_LABEL[method]} · {account} verified.{' '}
          <button className="underline" onClick={() => onChange({ ...value, verified: false })}>Change</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(['MPESA', 'BANK'] as const).map((m) => (
              <OptionCard key={m} selected={method === m} onClick={() => onChange({ method: m, account: m === 'MPESA' ? me.phone : '', verified: false })} icon={<PayMark method={m} />} title={PAYOUT_METHOD_LABEL[m]} />
            ))}
          </div>
          <Field label={method === 'MPESA' ? 'M-Pesa number' : 'Bank account number'}>
            <Input value={account} onChange={(e) => onChange({ ...value, account: e.target.value })} />
          </Field>
          <Button className="self-start" variant="secondary" disabled={account.length < 6} onClick={() => setVerifying(true)}>
            Verify account
          </Button>
        </>
      )}
    </div>
  );
}

export const payoutAccountFrom = (p: PayoutDraft) => ({
  method: p.method,
  account: p.method === 'BANK' ? `•••• ${p.account.slice(-4)}` : p.account,
  schedule: 'WEEKLY' as const,
  verified: true,
});

export type IdStage = 'form' | 'checking' | 'done' | 'inperson';

export function IdVerificationStep({ stage, onStage, blurb }: { stage: IdStage; onStage: (s: IdStage) => void; blurb: string }) {
  const [idNumber, setIdNumber] = useState('');
  const [selfie, setSelfie] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-heading text-text">Verify your identity</h2>
      <p className="text-sm text-muted">{blurb}</p>
      {stage === 'checking' && (
        <ProcessingSteps
          title="Verifying your ID"
          done="Identity verified"
          steps={['Checking ID number with IPRS', 'Matching selfie to ID photo', 'Running liveness check']}
          stepMs={1300}
          onDone={() => onStage('done')}
        />
      )}
      {stage === 'done' && <div className="flex items-center gap-2 text-sm font-medium text-good"><IdCard className="size-5" /> ID verified{idNumber && ` · ID ••••${idNumber.slice(-3)}`}</div>}
      {stage === 'inperson' && (
        <p className="text-sm text-warn">
          In-person verification booked. Visit any partner agent (e.g. Selah desk, Westgate Mall) with your ID. You can go live now and take bookings and jobs up to {formatKES(kes(50000))} until you’re verified.
        </p>
      )}
      {stage === 'form' && (
        <>
          <Field label="National ID number">
            <Input inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))} placeholder="12345678" />
          </Field>
          <FileDrop label="Take a selfie" hint="Good lighting, face the camera, no hat or sunglasses" files={selfie} onChange={setSelfie} accept="image/*" />
          <div className="flex flex-wrap gap-2">
            <Button icon={<Camera className="size-4" />} disabled={idNumber.length < 7 || !selfie.length} onClick={() => onStage('checking')}>
              Verify me
            </Button>
            <Button variant="ghost" icon={<MapPinned className="size-4" />} onClick={() => onStage('inperson')}>
              No smartphone? Verify in person
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
