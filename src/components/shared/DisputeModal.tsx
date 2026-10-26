'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { raiseDispute } from '@/lib/store/actions/orders';
import type { EscrowId, PartyRef } from '@/types';

const REASONS = ['Event cancelled', 'Denied entry', 'Table not honoured', 'Artist didn’t show up', 'Artist arrived late', 'Item not delivered', 'Charged twice', 'Other'];

export function DisputeModal({ open, onClose, escrowId, raisedBy }: { open: boolean; onClose: () => void; escrowId: EscrowId; raisedBy: PartyRef }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report a problem"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!reason || details.trim().length < 10) return setError('Choose a reason and describe what happened (at least 10 characters).');
              const id = raiseDispute(escrowId, raisedBy, reason, details.trim());
              onClose();
              router.push(`/disputes/${id}`);
            }}
          >
            Open dispute
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">Opening a dispute freezes the payment in escrow while our team reviews. If it’s resolved in your favour you’ll be refunded to your Selah wallet.</p>
        <Field label="What went wrong?">
          <Select value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} placeholder="Choose a reason" />
        </Field>
        <Field label="Details" error={error}>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what happened, with times if you can." />
        </Field>
      </div>
    </Modal>
  );
}
