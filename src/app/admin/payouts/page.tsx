'use client';

import { useState } from 'react';
import { CalendarClock, Hourglass, Send } from 'lucide-react';
import { PartyLink, Table } from '@/components/admin/AdminUI';
import { ShareBar } from '@/components/admin/ReportCharts';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Field';
import { Modal, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { pendingPayouts, scheduledDue, sellers } from '@/lib/admin';
import { PAYOUT_METHOD_LABEL, TRANSACTION_TONE, humanize, payoutStatusLabel } from '@/lib/constants/labels';
import { csvDate, csvMoney, today } from '@/lib/csv';
import { formatDateTime, formatKES, timeAgo } from '@/lib/format';
import { currentPolicy, partyName, samePartyRef, walletOf } from '@/lib/selectors';
import { approvePayouts, rejectPayout, runScheduledPayouts } from '@/lib/store/actions/admin';
import { useWorld } from '@/lib/store/hooks';
import type { Minor, PartyRef, Payout } from '@/types';

type Tab = 'REVIEW' | 'SCHEDULED' | 'HISTORY';

const sum = (xs: Minor[]) => xs.reduce((a, x) => a + x, 0) as Minor;
const key = (p: PartyRef) => `${p.kind}:${p.id}`;

export default function AdminPayoutsPage() {
  const w = useWorld();
  const policy = currentPolicy(w);
  const [tab, setTab] = useState<Tab>('REVIEW');
  const [rejecting, setRejecting] = useState<Payout | null>(null);
  const [note, setNote] = useState('');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const pending = pendingPayouts(w);
  const due = scheduledDue(w);
  const selected = due.filter((d) => !skipped.has(key(d.party)));
  const history = w.payouts.filter((p) => p.status !== 'PENDING');
  const accountOf = (p: PartyRef) => sellers(w).find((s) => samePartyRef(s.party, p))?.account;

  const toggle = (p: PartyRef) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key(p))) next.delete(key(p));
      else next.add(key(p));
      return next;
    });

  const reject = () => {
    if (!rejecting) return;
    rejectPayout(rejecting.id, note.trim());
    toast(`${formatKES(rejecting.amount)} returned to ${partyName(w, rejecting.party)}’s wallet`, 'info');
    setRejecting(null);
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle={`Withdrawals over ${formatKES(policy.payoutReviewAbove)} wait here for review; smaller ones go straight out. Scheduled sellers are paid in a batch you run.`}
        action={
          <ExportButton
            filename={`selah-payouts-${tab.toLowerCase()}-${today()}`}
            build={() =>
              tab === 'SCHEDULED'
                ? { head: ['Seller', 'Schedule', 'Method', 'Account', 'Last paid', 'Amount (KES)'], rows: due.map((d) => [d.name, d.account.schedule, d.account.method, d.account.account, d.lastPaidAt ? csvDate(d.lastPaidAt) : '', csvMoney(d.balance)]) }
                : {
                    head: ['Requested', 'Settled', 'Account', 'Source', 'Method', 'Status', 'Note', 'Amount (KES)'],
                    rows: (tab === 'REVIEW' ? pending : history).map((p) => [csvDate(p.at), p.settledAt ? csvDate(p.settledAt) : '', partyName(w, p.party), p.source ?? 'REQUEST', p.method, p.status, p.note ?? '', csvMoney(p.amount)]),
                  }
            }
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Awaiting review" icon={<Hourglass className="size-4" />} value={formatKES(sum(pending.map((p) => p.amount)), { compact: true })} hint={`${pending.length} requests, already reserved from wallets`} />
        <Stat label="Scheduled run due" icon={<CalendarClock className="size-4" />} value={formatKES(sum(due.map((d) => d.balance)), { compact: true })} hint={`${due.length} weekly or monthly sellers over the ${formatKES(policy.minPayoutThreshold)} minimum`} />
        <Stat label="Sent, all time" icon={<Send className="size-4" />} value={formatKES(sum(history.filter((p) => p.status === 'RELEASED').map((p) => p.amount)), { compact: true })} hint={`${history.filter((p) => p.status === 'FAILED').length} returned to wallets`} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Cash needed to clear the queue" subtitle={`${formatKES(sum([...pending.map((p) => p.amount), ...due.map((d) => d.balance)]))} if you approve everything and run the schedule today.`} />
        <ShareBar
          segments={[
            { label: 'Awaiting review', hint: `${pending.length} large withdrawals`, amount: sum(pending.map((p) => p.amount)) },
            { label: 'Scheduled run', hint: `${due.length} sellers due`, amount: sum(due.map((d) => d.balance)) },
          ]}
        />
      </Card>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'REVIEW', label: 'Awaiting review', count: pending.length || undefined },
          { value: 'SCHEDULED', label: 'Scheduled run', count: due.length || undefined },
          { value: 'HISTORY', label: 'History', count: history.length },
        ]}
      />

      {tab === 'REVIEW' && (
        <>
          {pending.length > 1 && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => { approvePayouts(pending.map((p) => p.id)); toast(`${pending.length} payouts sent`); }}>Approve all {formatKES(sum(pending.map((p) => p.amount)))}</Button>
            </div>
          )}
          <Table
            head={['Requested', 'Seller', 'Send to', 'Wallet after', 'Amount', '']}
            empty="Nothing waiting. Large withdrawals land here for a check before they’re sent."
            rows={pending.map((p) => {
              const account = accountOf(p.party);
              return [
                <span key="w" className="whitespace-nowrap text-muted">{timeAgo(p.at)}</span>,
                <PartyLink key="p" world={w} party={p.party} />,
                <span key="m" className="flex flex-col"><span>{PAYOUT_METHOD_LABEL[p.method]}</span><span className="text-xs text-muted">{account ? `${account.bankName ? `${account.bankName} ` : ''}${account.account}${account.verified ? '' : ' · unverified'}` : 'No saved account'}</span></span>,
                <Money key="b" amount={walletOf(w, p.party)} className="text-muted" />,
                <Money key="a" amount={p.amount} className="font-medium" />,
                <span key="x" className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setRejecting(p)}>Reject</Button>
                  <Button size="sm" onClick={() => { approvePayouts([p.id]); toast(`${formatKES(p.amount)} sent to ${partyName(w, p.party)}`); }}>Approve</Button>
                </span>,
              ];
            })}
          />
        </>
      )}

      {tab === 'SCHEDULED' && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Each seller is paid their whole balance to their saved account. Untick anyone to hold them back this run.</p>
            <Button
              size="sm"
              disabled={!selected.length}
              onClick={() => {
                const n = runScheduledPayouts(selected.map((d) => d.party));
                toast(`${n} scheduled payouts sent, ${formatKES(sum(selected.map((d) => d.balance)))} in total`);
                setSkipped(new Set());
              }}
            >
              Pay {selected.length} · {formatKES(sum(selected.map((d) => d.balance)))}
            </Button>
          </div>
          <Table
            head={['', 'Seller', 'Schedule', 'Send to', 'Last paid', 'Amount']}
            empty="No scheduled payouts are due."
            rows={due.map((d) => [
              <input key="c" type="checkbox" aria-label={`Include ${d.name}`} className="size-4 accent-[var(--brand)]" checked={!skipped.has(key(d.party))} onChange={() => toggle(d.party)} />,
              <PartyLink key="p" world={w} party={d.party} />,
              <span key="s" className="text-muted">{humanize(d.account.schedule)}</span>,
              <span key="m" className="flex flex-col"><span>{PAYOUT_METHOD_LABEL[d.account.method]}</span><span className="text-xs text-muted">{d.account.account}</span></span>,
              <span key="l" className="text-muted">{d.lastPaidAt ? timeAgo(d.lastPaidAt) : 'Never'}</span>,
              <Money key="a" amount={d.balance} className="font-medium" />,
            ])}
          />
        </>
      )}

      {tab === 'HISTORY' && (
        <Table
          head={['Requested', 'Seller', 'Source', 'Method', 'Status', 'Amount']}
          empty="No payouts yet."
          rows={history.map((p) => [
            <span key="w" className="flex flex-col whitespace-nowrap"><span className="text-muted">{formatDateTime(p.at)}</span>{p.note && <span className="text-xs text-muted">“{p.note}”</span>}</span>,
            <PartyLink key="p" world={w} party={p.party} />,
            <span key="s" className="text-muted">{p.source === 'SCHEDULE' ? 'Scheduled run' : 'Requested'}</span>,
            PAYOUT_METHOD_LABEL[p.method],
            <StatusPill key="st" status={p.status} tones={TRANSACTION_TONE} label={payoutStatusLabel(p.status)} />,
            <Money key="a" amount={p.amount} className="font-medium" />,
          ])}
        />
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Reject ${formatKES(rejecting.amount)} payout` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" onClick={reject}>Return to wallet</Button>
          </>
        }
      >
        {rejecting && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">The money goes back into {partyName(w, rejecting.party)}’s Selah wallet. They can withdraw again once the issue is fixed.</p>
            <Field label="Reason, sent to the seller (optional)">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank account name doesn’t match the business registration." />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
