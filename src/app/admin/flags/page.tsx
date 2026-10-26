'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PartyLink, Table } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Badge, DefinitionList, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Field';
import { Modal, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { openFlags } from '@/lib/admin';
import { FLAG_STATUS_LABEL, FLAG_TONE } from '@/lib/constants/labels';
import { formatDateTime, timeAgo } from '@/lib/format';
import { byId, flagKindLabel, flagTargetHref, flagTargetName, flagTargetOwner } from '@/lib/selectors';
import { resolveFlag } from '@/lib/store/actions/admin';
import { useWorld } from '@/lib/store/hooks';
import type { FlagId } from '@/types';

export default function AdminFlagsPage() {
  const w = useWorld();
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [reviewing, setReviewing] = useState<FlagId | null>(null);
  const [note, setNote] = useState('');
  const open = openFlags(w);
  const list = tab === 'OPEN' ? open : w.flags.filter((f) => f.status !== 'OPEN');
  const f = byId(w.flags, reviewing ?? undefined);
  // Repeat reports on the same target weigh more than a one-off.
  const reportsOn = (t: (typeof w.flags)[number]['target']) => w.flags.filter((x) => x.target.kind === t.kind && x.target.id === t.id).length;

  const decide = (outcome: 'UPHELD' | 'DISMISSED') => {
    if (!f) return;
    resolveFlag(f.id, outcome, note.trim());
    toast(outcome === 'UPHELD' ? 'Upheld. The owner has been asked to fix it.' : 'Dismissed. The reporter has been told.', outcome === 'UPHELD' ? 'good' : 'info');
    setReviewing(null);
    setNote('');
  };

  return (
    <div>
      <PageHeader title="Reported content" subtitle="Profiles and listings people have flagged. Uphold to warn the owner, or dismiss. Payment problems go to Disputes." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'OPEN', label: 'Open', count: open.length }, { value: 'CLOSED', label: 'Closed', count: w.flags.length - open.length }]} />
      <Table
        head={['Reported', 'Reason', 'Reported by', 'Owner', 'Status', '']}
        empty={tab === 'OPEN' ? 'No open reports.' : 'Nothing reviewed yet.'}
        rows={list.map((x) => {
          const owner = flagTargetOwner(w, x.target);
          const n = reportsOn(x.target);
          return [
            <span key="t" className="flex flex-col">
              <Link href={flagTargetHref(w, x.target)} target="_blank" className="flex items-center gap-1 font-medium hover:text-brand">
                {flagTargetName(w, x.target)} <ExternalLink className="size-3 text-muted" />
              </Link>
              <span className="text-xs text-muted">{flagKindLabel(x.target)} · {timeAgo(x.createdAt)}</span>
            </span>,
            <span key="r" className="flex items-center gap-2">{x.reason}{n > 1 && <Badge tone="bad">{n} reports</Badge>}</span>,
            <PartyLink key="b" world={w} party={x.raisedBy} />,
            owner ? <PartyLink key="o" world={w} party={owner} /> : '–',
            <StatusPill key="s" status={x.status} tones={FLAG_TONE} label={FLAG_STATUS_LABEL[x.status]} />,
            <button key="v" onClick={() => setReviewing(x.id)} className="text-sm font-medium text-brand">{x.status === 'OPEN' ? 'Review' : 'View'}</button>,
          ];
        })}
      />

      <Modal
        open={!!f}
        onClose={() => setReviewing(null)}
        title={f ? `${flagKindLabel(f.target)}: ${flagTargetName(w, f.target)}` : ''}
        footer={
          f?.status === 'OPEN' && (
            <>
              <Button variant="ghost" onClick={() => decide('DISMISSED')}>Dismiss</Button>
              <Button variant="danger" onClick={() => decide('UPHELD')}>Uphold & warn owner</Button>
            </>
          )
        }
      >
        {f && (
          <div className="flex flex-col gap-4">
            <DefinitionList
              items={[
                ['Reason', f.reason],
                ['Reported by', <PartyLink key="b" world={w} party={f.raisedBy} />],
                ['When', formatDateTime(f.createdAt)],
                ['Status', <StatusPill key="s" status={f.status} tones={FLAG_TONE} label={FLAG_STATUS_LABEL[f.status]} />],
              ]}
            />
            <p className="border-l-2 border-border pl-3 text-sm text-text">“{f.details}”</p>
            {f.status === 'OPEN' ? (
              <Field label="Note to both parties (optional)" hint="The reporter’s name is never shown to the owner.">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please remove the misleading ‘free entry’ line." />
              </Field>
            ) : (
              f.note && <p className="text-sm text-muted">Note: {f.note}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
