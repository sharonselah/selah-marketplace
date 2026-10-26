'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Modal, ProcessingSteps } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { PayMark } from '@/components/ui/Visuals';
import type { PayoutMethod } from '@/lib/constants/enums';
import { PAYOUT_METHOD_LABEL } from '@/lib/constants/labels';
import { formatKES, kes } from '@/lib/format';
import { payoutError, payoutNeedsReview, requestPayout, topUp } from '@/lib/store/actions/wallet';
import type { Minor, PartyRef } from '@/types';
import { PaymentMethodPicker, PaymentProcessing } from './Payment';

const PRESETS = [500, 1000, 2500, 5000, 10000];

export function TopUpModal({ open, onClose, party, phone }: { open: boolean; onClose: () => void; party: PartyRef; phone: string }) {
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState<'MPESA' | 'CARD'>('MPESA');
  const [stage, setStage] = useState<'form' | 'paying'>('form');
  const value = kes(Number(amount) || 0);
  const close = () => {
    setStage('form');
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Top up wallet">
      {stage === 'paying' ? (
        <PaymentProcessing
          method={method}
          amount={value}
          phone={phone}
          escrow={false}
          onDone={() => {
            topUp(party, value, method);
            toast(`${formatKES(value)} added to your wallet`);
            close();
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Amount (KES)">
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setAmount(String(p))} className={`rounded-full px-3 py-1 text-sm ${Number(amount) === p ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:bg-brand-soft'}`}>
                {p.toLocaleString()}
              </button>
            ))}
          </div>
          <PaymentMethodPicker value={method} onChange={(m) => setMethod(m as 'MPESA' | 'CARD')} amount={value} methods={['MPESA', 'CARD']} />
          <Button block size="lg" disabled={value < kes(50)} onClick={() => setStage('paying')}>
            Top up {formatKES(value)}
          </Button>
          <p className="text-center text-xs text-muted">Minimum top-up KES 50</p>
        </div>
      )}
    </Modal>
  );
}

export function PayoutModal({ open, onClose, party, balance, defaultMethod = 'MPESA', destination }: { open: boolean; onClose: () => void; party: PartyRef; balance: Minor; defaultMethod?: PayoutMethod; destination: string }) {
  const [amount, setAmount] = useState(String(Math.floor(balance / 100)));
  const [method, setMethod] = useState<PayoutMethod>(defaultMethod);
  const [stage, setStage] = useState<'form' | 'sending'>('form');
  const [error, setError] = useState<string | null>(null);
  const value = kes(Number(amount) || 0);
  const review = payoutNeedsReview(value);
  const close = () => {
    setStage('form');
    setError(null);
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Withdraw funds">
      {stage === 'sending' ? (
        review ? (
          <ProcessingSteps
            title="Requesting payout"
            done="Payout requested"
            steps={[`Reserving ${formatKES(value)} from your wallet`, 'Queued for Selah review']}
            onDone={() => {
              requestPayout(party, value, method);
              toast(`${formatKES(value)} payout is in review`, 'info');
              close();
            }}
          />
        ) : (
          <ProcessingSteps
            title="Sending payout"
            done="Payout sent"
            steps={[`Debiting ${formatKES(value)} from your wallet`, `Sending to ${PAYOUT_METHOD_LABEL[method]} (${destination})`, 'Confirmed by provider']}
            onDone={() => {
              requestPayout(party, value, method);
              toast(`${formatKES(value)} sent to your ${PAYOUT_METHOD_LABEL[method]}`);
              close();
            }}
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Available: <span className="font-semibold text-text">{formatKES(balance)}</span>
          </p>
          <Field label="Amount (KES)" error={error}>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(['MPESA', 'BANK'] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`flex items-center gap-3 rounded-tile p-3 text-left text-sm font-medium text-text transition ${method === m ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface-2 hover:bg-brand-soft'}`}>
                <PayMark method={m} />
                {PAYOUT_METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          {review && <p className="text-xs text-muted">Withdrawals this large are checked by Selah before they’re sent, usually within a day. The amount is reserved from your wallet meanwhile.</p>}
          <Button
            block
            size="lg"
            onClick={() => {
              const err = payoutError(party, value);
              if (err) return setError(err);
              setStage('sending');
            }}
          >
            Withdraw {formatKES(value)}
          </Button>
        </div>
      )}
    </Modal>
  );
}
