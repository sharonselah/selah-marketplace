'use client';

import { useState } from 'react';
import { PartyLink, SearchBox, Table, matches } from '@/components/admin/AdminUI';
import { SplitBreakdown } from '@/components/shared/Escrow';
import { ExportButton } from '@/components/shared/ExportButton';
import { Badge, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Modal, Tabs } from '@/components/ui/Interactive';
import { ESCROW_STATE, TRANSACTION_STATUS, type CommissionType, type EscrowState, type TransactionStatus } from '@/lib/constants/enums';
import { COMMISSION_TYPE_LABEL, ESCROW_LABEL, ESCROW_TONE, PAYMENT_METHOD_LABEL, PAYOUT_METHOD_LABEL, TRANSACTION_TONE, humanize, payoutStatusLabel } from '@/lib/constants/labels';
import { cn } from '@/lib/cn';
import { csvDate, csvMoney, subjectLabel, today, type Cell } from '@/lib/csv';
import { formatDateTime, formatKES } from '@/lib/format';
import { partyName } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';
import type { Escrow, Minor } from '@/types';

type Tab = 'ESCROWS' | 'TRANSACTIONS' | 'SPLITS' | 'PAYOUTS';

function Chips<T extends string>({ all, value, onChange, count, label }: { all: readonly T[]; value: T | 'ALL'; onChange: (v: T | 'ALL') => void; count: (v: T) => number; label: (v: T) => string }) {
  const chip = (v: T | 'ALL', text: string, n?: number) => (
    <button key={v} onClick={() => onChange(v)} className={cn('rounded-full px-3 py-1 text-xs font-medium', value === v ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted hover:bg-brand-soft')}>
      {text}{n !== undefined && <span className="ml-1 opacity-70">{n}</span>}
    </button>
  );
  return <div className="mb-4 flex flex-wrap gap-2">{chip('ALL', 'All')}{all.map((v) => chip(v, label(v), count(v)))}</div>;
}

export default function AdminLedgerPage() {
  const w = useWorld();
  const [tab, setTab] = useState<Tab>('ESCROWS');
  const [state, setState] = useState<EscrowState | 'ALL'>('ALL');
  const [txStatus, setTxStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Escrow | null>(null);

  const escrows = w.escrows.filter((e) => (state === 'ALL' || e.state === state) && matches(q, partyName(w, e.payer), partyName(w, e.payee), e.id));
  const txns = w.transactions.filter((t) => (txStatus === 'ALL' || t.status === txStatus) && matches(q, t.description, partyName(w, t.party)));

  // Split totals per commission type and policy version, over funded escrows.
  const splitRows = new Map<string, { type: CommissionType; version: string; amount: Minor; count: number }>();
  for (const e of w.escrows) {
    if (e.state === 'AWAITING_FUNDS' || e.state === 'REFUNDED') continue;
    for (const s of e.splits) {
      const key = `${s.type}|${s.policyVersion}`;
      const row = splitRows.get(key) ?? { type: s.type, version: s.policyVersion, amount: 0 as Minor, count: 0 };
      row.amount = (row.amount + s.amount) as Minor;
      row.count++;
      splitRows.set(key, row);
    }
  }

  const splitList = [...splitRows.values()].sort((a, b) => a.version.localeCompare(b.version) || a.type.localeCompare(b.type));
  // Exports follow the open tab and its filters, so finance gets exactly what's on screen.
  const exportTab = (): { head: string[]; rows: Cell[][] } => {
    if (tab === 'ESCROWS') return { head: ['Escrow', 'Subject', 'Item', 'Payer', 'Payee', 'State', 'Held at', 'Amount (KES)', 'Platform fee (KES)', 'Policy'], rows: escrows.map((e) => [e.id, e.subject.kind, subjectLabel(w, e.subject), partyName(w, e.payer), partyName(w, e.payee), e.state, csvDate(e.heldAt), csvMoney(e.amount), csvMoney(e.splits.filter((s) => s.to === 'PLATFORM').reduce((a, s) => a + s.amount, 0) as Minor), e.splits[0]?.policyVersion]) };
    if (tab === 'TRANSACTIONS') return { head: ['Date', 'Account', 'Description', 'Method', 'Status', 'Amount (KES)'], rows: txns.map((t) => [csvDate(t.at), partyName(w, t.party), t.description, t.method, t.status, csvMoney((t.direction === 'OUT' ? -t.amount : t.amount) as Minor)]) };
    if (tab === 'SPLITS') return { head: ['Commission type', 'Policy', 'Escrows', 'Total (KES)'], rows: splitList.map((r) => [COMMISSION_TYPE_LABEL[r.type], r.version, r.count, csvMoney(r.amount)]) };
    return { head: ['Date', 'Account', 'Method', 'Status', 'Amount (KES)'], rows: w.payouts.map((p) => [csvDate(p.at), partyName(w, p.party), p.method, p.status, csvMoney(p.amount)]) };
  };

  return (
    <div>
      <PageHeader title="Ledger" subtitle="Escrow → split → payout, across every account. Read-only: money moves only through the flows." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ESCROWS', label: 'Escrows', count: w.escrows.length }, { value: 'TRANSACTIONS', label: 'Transactions', count: w.transactions.length }, { value: 'SPLITS', label: 'Splits' }, { value: 'PAYOUTS', label: 'Payouts', count: w.payouts.length }]} />
        <div className="flex flex-wrap items-center gap-2">
          {(tab === 'ESCROWS' || tab === 'TRANSACTIONS') && <SearchBox value={q} onChange={setQ} placeholder="Party or description…" />}
          <ExportButton filename={`selah-ledger-${tab.toLowerCase()}-${today()}`} build={exportTab} />
        </div>
      </div>

      {tab === 'ESCROWS' && (
        <>
          <Chips all={ESCROW_STATE} value={state} onChange={setState} count={(s) => w.escrows.filter((e) => e.state === s).length} label={(s) => ESCROW_LABEL[s]} />
          <Table
            head={['Subject', 'Payer → payee', 'Trigger', 'State', 'Amount', '']}
            empty="No escrows match."
            rows={escrows.map((e) => [
              <span key="s" className="flex flex-col"><span className="font-medium">{humanize(e.subject.kind)}</span><span className="text-xs text-muted">{e.subject.id}</span></span>,
              <span key="p" className="flex flex-wrap items-center gap-1"><PartyLink world={w} party={e.payer} /> <span className="text-muted">→</span> <PartyLink world={w} party={e.payee} /></span>,
              <span key="t" className="text-xs text-muted">{humanize(e.trigger)}</span>,
              <StatusPill key="st" status={e.state} tones={ESCROW_TONE} label={ESCROW_LABEL[e.state]} />,
              <Money key="m" amount={e.amount} className="font-medium" />,
              <button key="b" onClick={() => setOpen(e)} className="text-sm font-medium text-brand">Splits</button>,
            ])}
          />
        </>
      )}

      {tab === 'TRANSACTIONS' && (
        <>
          <Chips all={TRANSACTION_STATUS} value={txStatus} onChange={setTxStatus} count={(s) => w.transactions.filter((t) => t.status === s).length} label={humanize} />
          <Table
            head={['When', 'Account', 'Description', 'Method', 'Status', 'Amount']}
            empty="No transactions match."
            rows={txns.map((t) => [
              <span key="w" className="whitespace-nowrap text-muted">{formatDateTime(t.at)}</span>,
              <PartyLink key="p" world={w} party={t.party} />,
              t.description,
              <span key="m" className="text-muted">{t.method ? PAYMENT_METHOD_LABEL[t.method] : '–'}</span>,
              <StatusPill key="s" status={t.status} tones={TRANSACTION_TONE} />,
              <Money key="a" amount={(t.direction === 'OUT' ? -t.amount : t.amount) as Minor} className={t.direction === 'IN' ? 'text-good' : undefined} />,
            ])}
          />
        </>
      )}

      {tab === 'SPLITS' && (
        <>
          <p className="mb-4 text-sm text-muted">Funded escrows only, grouped by the policy version they were opened under, so you can reconcile across rate changes.</p>
          <Table
            head={['Commission type', 'Policy', 'Escrows', 'Total']}
            rows={splitList.map((r) => [COMMISSION_TYPE_LABEL[r.type], <Badge key="v">{r.version}</Badge>, r.count, <Money key="m" amount={r.amount} className="font-medium" />])}
          />
        </>
      )}

      {tab === 'PAYOUTS' && (
        <Table
          head={['When', 'Account', 'Method', 'Status', 'Amount']}
          empty="No payouts yet."
          rows={w.payouts.map((p) => [
            <span key="w" className="text-muted">{formatDateTime(p.at)}</span>,
            <PartyLink key="p" world={w} party={p.party} />,
            PAYOUT_METHOD_LABEL[p.method],
            <StatusPill key="s" status={p.status} tones={TRANSACTION_TONE} label={payoutStatusLabel(p.status)} />,
            <Money key="m" amount={p.amount} className="font-medium" />,
          ])}
        />
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${humanize(open.subject.kind)} · ${formatKES(open.amount)}` : ''}>
        {open && (
          <>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted">{partyName(w, open.payer)} → {partyName(w, open.payee)}</span>
              <StatusPill status={open.state} tones={ESCROW_TONE} label={ESCROW_LABEL[open.state]} />
            </div>
            <SplitBreakdown total={open.amount} splits={open.splits} />
            {open.heldAt && <p className="mt-3 text-xs text-muted">Held {formatDateTime(open.heldAt)}{open.releaseAt ? ` · releases ${formatDateTime(open.releaseAt)}` : ''}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
