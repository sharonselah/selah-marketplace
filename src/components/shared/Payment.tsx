'use client';

import type { PaymentMethod } from '@/lib/constants/enums';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants/labels';
import { formatKES, maskPhone } from '@/lib/format';
import type { Minor } from '@/types';
import { OptionCard } from '@/components/ui/Field';
import { ProcessingSteps } from '@/components/ui/Interactive';
import { PayMark } from '@/components/ui/Visuals';

export function PaymentMethodPicker({ value, onChange, walletBalance, amount, methods = ['MPESA', 'CARD', 'WALLET'] }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void; walletBalance?: Minor; amount: Minor; methods?: PaymentMethod[] }) {
  return (
    <div className="flex flex-col gap-2">
      {methods.map((m) => {
        const short = m === 'WALLET' && walletBalance !== undefined && walletBalance < amount;
        return (
          <OptionCard
            key={m}
            selected={value === m}
            onClick={() => onChange(m)}
            icon={<PayMark method={m} />}
            title={PAYMENT_METHOD_LABEL[m]}
            description={
              m === 'MPESA'
                ? 'You’ll get an STK push on your phone. Enter your PIN to pay.'
                : m === 'CARD'
                  ? 'Visa or Mastercard'
                  : walletBalance !== undefined
                    ? `Balance ${formatKES(walletBalance)}${short ? ', not enough for this payment' : ''}`
                    : 'Pay from your Selah balance'
            }
          />
        );
      })}
    </div>
  );
}

export function paymentBlocked(method: PaymentMethod, amount: Minor, walletBalance: Minor): string | null {
  return method === 'WALLET' && walletBalance < amount ? 'Not enough in your wallet. Top up or choose M-Pesa.' : null;
}

/** The simulated payment rail: STK push, 3-D Secure or wallet debit, then escrow. */
export function PaymentProcessing({ method, amount, phone, onDone, escrow = true }: { method: PaymentMethod; amount: Minor; phone: string; onDone: () => void; escrow?: boolean }) {
  const steps =
    method === 'MPESA'
      ? [`M-Pesa request sent to ${maskPhone(phone)}`, 'Waiting for you to enter your M-Pesa PIN…', `Payment of ${formatKES(amount)} received`]
      : method === 'CARD'
        ? ['Contacting your bank', '3-D Secure verification', `Card charged ${formatKES(amount)}`]
        : [`Debiting ${formatKES(amount)} from your wallet`];
  return (
    <div className="flex flex-col gap-6">
      {method === 'MPESA' && (
        <div className="mx-auto w-56 rounded-card border-4 border-text/80 bg-surface p-4 text-center shadow-float">
          <div className="text-xs font-semibold text-good">M-PESA</div>
          <div className="mt-2 text-xs text-text">Do you want to pay {formatKES(amount)} to SELAH ESCROW?</div>
          <div className="mt-3 rounded-tile bg-surface-2 py-1.5 font-mono text-sm tracking-[0.4em] text-muted">••••</div>
          <div className="mt-2 text-[10px] text-muted">Enter M-PESA PIN</div>
        </div>
      )}
      <ProcessingSteps title="Processing payment" done="Payment successful" steps={escrow ? [...steps, 'Securing funds in escrow'] : steps} stepMs={1200} onDone={onDone} />
    </div>
  );
}
