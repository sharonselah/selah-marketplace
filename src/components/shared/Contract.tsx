'use client';

import { useState } from 'react';
import { CheckCircle2, FileSignature, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Field';
import { Modal, ProcessingSteps } from '@/components/ui/Interactive';
import { CONTRACT_TONE } from '@/lib/constants/labels';
import { partyName, samePartyRef } from '@/lib/selectors';
import type { Contract, PartyRef, World } from '@/types';

/** Contract viewer with in-app e-sign. `parties` lists who must sign. */
export function ContractCard({ world, contract, parties, me, onSign }: { world: World; contract: Contract; parties: PartyRef[]; me: PartyRef; onSign: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const signed = (p: PartyRef) => contract.signedBy.some((s) => samePartyRef(s, p));
  const iSigned = signed(me);

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><FileSignature className="size-4 text-brand" /> {contract.title}</span>} action={<StatusPill status={contract.status} tones={CONTRACT_TONE} />} />
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
        {contract.terms.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-1">
        {parties.map((p) => (
          <div key={p.id} className={`flex items-center gap-2 py-2.5 text-sm ${signed(p) ? 'text-good' : 'text-muted'}`}>
            {signed(p) ? <CheckCircle2 className="size-4" /> : <PenLine className="size-4" />}
            <span className="truncate">{partyName(world, p)}</span>
            <span className="ml-auto text-xs">{signed(p) ? 'Signed' : 'Awaiting'}</span>
          </div>
        ))}
      </div>
      {!iSigned && contract.status === 'SENT' && (
        <Button className="mt-4" icon={<PenLine className="size-4" />} onClick={() => setOpen(true)}>
          Review & sign
        </Button>
      )}
      <Modal open={open} onClose={() => !signing && setOpen(false)} title="Sign contract">
        {signing ? (
          <ProcessingSteps
            title="Signing"
            done="Contract signed"
            steps={['Applying your e-signature', 'Timestamping the agreement', 'Notifying the other party']}
            stepMs={800}
            onDone={() => {
              onSign();
              setSigning(false);
              setOpen(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">By typing your full name you agree to the terms above. This has the same effect as a handwritten signature.</p>
            <Field label="Type your full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="font-serif text-lg italic" />
            </Field>
            <Button block size="lg" disabled={name.trim().length < 3} onClick={() => setSigning(true)}>
              Sign agreement
            </Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
