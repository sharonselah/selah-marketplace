'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { flagKindLabel, flagTargetName } from '@/lib/selectors';
import { reportContent } from '@/lib/store/actions/flags';
import { useViewer } from '@/lib/store/hooks';
import type { FlagTarget } from '@/types';

const REASONS = ['Misleading listing', 'Impersonation or fake account', 'Stolen or copyrighted content', 'Offensive or hateful content', 'Scam or fraud', 'Unsafe venue or event', 'Other'];

function ReportModal({ open, onClose, target }: { open: boolean; onClose: () => void; target: FlagTarget }) {
  const { world, actingAs } = useViewer();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report ${flagKindLabel(target).toLowerCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!reason || details.trim().length < 10) return setError('Choose a reason and tell us what’s wrong (at least 10 characters).');
              reportContent(target, actingAs, reason, details.trim());
              toast('Report sent. Our team will review it.');
              onClose();
            }}
          >
            Send report
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Reporting <span className="font-medium text-text">{flagTargetName(world, target)}</span>. Reports are anonymous to the owner. For a problem with something you paid for, open a dispute from the order or booking instead.
        </p>
        <Field label="What’s wrong?">
          <Select value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} placeholder="Choose a reason" />
        </Field>
        <Field label="Details" error={error}>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What did you see? Links or times help." />
        </Field>
      </div>
    </Modal>
  );
}

/** Small "Report" trigger for profiles and listings; pass `iconOnly` inside dense rows. */
export function ReportButton({ target, iconOnly, className }: { target: FlagTarget; iconOnly?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {iconOnly ? (
        <button onClick={() => setOpen(true)} aria-label="Report" title="Report" className={cn('rounded-tile p-1.5 text-muted hover:bg-surface-2 hover:text-bad', className)}>
          <Flag className="size-3.5" />
        </button>
      ) : (
        <Button size="sm" variant="ghost" icon={<Flag className="size-4" />} onClick={() => setOpen(true)} className={className}>
          Report
        </Button>
      )}
      {open && <ReportModal open onClose={() => setOpen(false)} target={target} />}
    </>
  );
}
