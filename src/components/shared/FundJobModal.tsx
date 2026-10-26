'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Interactive';
import type { PaymentMethod } from '@/lib/constants/enums';
import { formatKES } from '@/lib/format';
import type { Minor } from '@/types';
import { PaymentMethodPicker, PaymentProcessing, paymentBlocked } from './Payment';

/** Brand pays a creator's fee into escrow before the job starts (accepting a proposal or sending an invite). */
export function FundJobModal({ title, amount, balance, phone, intro, onPaid, onClose }: { title: string; amount: Minor; balance: Minor; phone: string; intro: ReactNode; onPaid: (m: PaymentMethod) => void; onClose: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(balance >= amount ? 'WALLET' : 'MPESA');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open onClose={() => !paying && onClose()} title={title}>
      {paying ? (
        <PaymentProcessing method={method} amount={amount} phone={phone} onDone={() => onPaid(method)} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted">{intro}</div>
          <PaymentMethodPicker value={method} onChange={(m) => { setMethod(m); setError(null); }} walletBalance={balance} amount={amount} />
          {error && <p className="text-sm text-bad">{error}</p>}
          <Button block size="lg" onClick={() => { const b = paymentBlocked(method, amount, balance); if (b) return setError(b); setPaying(true); }}>
            Pay {formatKES(amount)} into escrow
          </Button>
        </div>
      )}
    </Modal>
  );
}
