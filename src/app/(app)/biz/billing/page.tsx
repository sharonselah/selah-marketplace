'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, FileText, Plus, Receipt } from 'lucide-react';
import { TopUpModal } from '@/components/shared/WalletModals';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, IconCircle, Money, PageHeader } from '@/components/ui/Display';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants/labels';
import { formatDate, formatKES } from '@/lib/format';
import { byId, samePartyRef, walletOf } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessAccount, Minor, Transaction, World } from '@/types';

interface Invoice {
  no: string;
  txn: Transaction;
  onAccount: boolean;
}

/** Every purchase is a billing document: on-account campaigns carry their invoice number, the rest get a receipt number. */
function invoicesFor(w: World, b: BusinessAccount): Invoice[] {
  return w.transactions
    .filter((t) => samePartyRef(t.party, { kind: 'BUSINESS', id: b.id }) && t.direction === 'OUT' && t.ref.kind !== 'PAYOUT')
    .sort((a, c) => c.at.localeCompare(a.at))
    .map((t) => {
      const ad = t.ref.kind === 'AD_CAMPAIGN' ? byId(w.adCampaigns, t.ref.id) : undefined;
      return { no: ad?.invoiceNo ?? `RCT-${t.id.slice(4, 12).toUpperCase()}`, txn: t, onAccount: !!ad?.invoiceNo };
    });
}

function download(inv: Invoice, b: BusinessAccount) {
  const lines = [
    'SELAH MARKETPLACE LTD · Westlands, Nairobi · PIN P052000000A',
    '',
    `${inv.onAccount ? 'TAX INVOICE' : 'RECEIPT'} ${inv.no}`,
    `Date: ${formatDate(inv.txn.at)}`,
    `Billed to: ${b.name} (${b.regTaxId})`,
    `${b.address}`,
    '',
    `${inv.txn.description}`,
    `Amount: ${formatKES(inv.txn.amount)}`,
    inv.onAccount ? 'Terms: net 30 days' : `Paid via ${inv.txn.method ? PAYMENT_METHOD_LABEL[inv.txn.method] : 'Selah'}`,
    '',
    'Prototype document. Not a real invoice.',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${inv.no}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const { world, me, actingAs, business } = useViewer();
  const b = business!;
  const [topup, setTopup] = useState(false);
  const invoices = invoicesFor(world, b);
  const due = invoices.filter((i) => i.onAccount && i.txn.status === 'HELD');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" subtitle="Your prepaid balance, invoices and receipts." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cover-g4 text-white md:col-span-2">
          <div className="text-sm opacity-80">Prepaid wallet</div>
          <div className="mt-1 text-display"><Money amount={walletOf(world, actingAs)} /></div>
          <Button className="mt-5 bg-white text-brand hover:bg-white/90" icon={<Plus className="size-4" />} onClick={() => setTopup(true)}>Top up</Button>
        </Card>
        <Card>
          <div className="text-sm text-muted">Billing mode</div>
          <div className="mt-1 text-heading text-text">{b.billing?.mode === 'INVOICED' ? 'Monthly invoice' : 'Prepaid wallet'}</div>
          <div className="text-xs text-muted">{b.billing?.email ?? 'No billing email'}</div>
          {due.length > 0 && <div className="mt-2 text-sm text-warn">{due.length} invoice{due.length > 1 ? 's' : ''} open · {formatKES(due.reduce((a, i) => a + i.txn.amount, 0) as Minor)}</div>}
          <Link href="/biz/settings#verification" className="mt-3 inline-block text-sm text-brand hover:underline">Change</Link>
        </Card>
      </div>
      <Card>
        <CardHeader title="Invoices & receipts" />
        {invoices.length === 0 ? (
          <EmptyState icon={<Receipt className="size-8" />} title="Nothing billed yet" body="Ad campaigns, creator jobs and artist bookings you pay for show up here." />
        ) : (
          <div className="flex flex-col gap-1">
            {invoices.map((inv) => (
              <div key={inv.txn.id} className="flex items-center gap-3 py-3">
                <IconCircle icon={<FileText className="size-4" />} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{inv.txn.description}</div>
                  <div className="text-xs text-muted">{inv.no} · {formatDate(inv.txn.at)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Money amount={inv.txn.amount} className="text-sm font-semibold text-text" />
                  {inv.onAccount ? <Badge tone={inv.txn.status === 'HELD' ? 'warn' : 'good'}>{inv.txn.status === 'HELD' ? 'Due' : 'Settled'}</Badge> : <Badge tone="good">Paid</Badge>}
                </div>
                <button className="rounded-tile p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Download ${inv.no}`} onClick={() => download(inv, b)}>
                  <Download className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <TopUpModal open={topup} onClose={() => setTopup(false)} party={actingAs} phone={me.phone} />
    </div>
  );
}
