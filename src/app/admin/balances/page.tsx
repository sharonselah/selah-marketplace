'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Landmark, Users, Vault } from 'lucide-react';
import { PartyLink, Table } from '@/components/admin/AdminUI';
import { ShareBar } from '@/components/admin/ReportCharts';
import { ExportButton } from '@/components/shared/ExportButton';
import { Card, CardHeader, Money, PageHeader, Stat } from '@/components/ui/Display';
import { largestWallets, platformBalances } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { csvMoney, today } from '@/lib/csv';
import { formatKES } from '@/lib/format';
import { heldFor } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';
import type { Minor } from '@/types';

type Line = { label: string; hint?: ReactNode; amount: Minor; minus?: boolean };

function Breakdown({ lines, total, totalLabel }: { lines: Line[]; total: Minor; totalLabel: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {lines.map((l, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5">
          <span className="flex flex-col">
            <span className="text-text">{l.label}</span>
            {l.hint && <span className="text-xs text-muted">{l.hint}</span>}
          </span>
          <Money amount={(l.minus ? -l.amount : l.amount) as Minor} className={cn('shrink-0', l.minus && 'text-muted')} />
        </div>
      ))}
      <div className="flex justify-between py-2.5 font-semibold text-text">
        <span>{totalLabel}</span>
        <Money amount={total} />
      </div>
    </div>
  );
}

export default function AdminBalancesPage() {
  const w = useWorld();
  const b = platformBalances(w);
  const top = largestWallets(w);

  const userLines: Line[] = [
    { label: 'Wallets: people', hint: 'Patrons, artists and creators', amount: b.wallets.people },
    { label: 'Wallets: businesses', hint: 'Venues, organisers and brands', amount: b.wallets.businesses },
    { label: 'Escrow: funds held', hint: 'Paid, waiting for fulfilment', amount: b.escrow.FUNDS_HELD },
    { label: 'Escrow: fulfilled', hint: 'In the hold window before release', amount: b.escrow.FULFILLED },
    { label: 'Escrow: disputed', hint: <Link href="/admin/disputes" className="hover:text-brand">Frozen until a dispute is resolved</Link>, amount: b.escrow.DISPUTED },
    { label: 'Payouts in transit', hint: <Link href="/admin/payouts" className="hover:text-brand">Reserved, awaiting review</Link>, amount: b.inTransit },
  ];
  const ownLines: Line[] = [
    { label: 'Fees earned', hint: 'Selah’s split on released escrows', amount: b.fees },
    { label: 'Earn rewards paid', hint: <Link href="/admin/reports" className="hover:text-brand">Referrals, recruitment, models, lyrics</Link>, amount: b.rewards, minus: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform balances"
        subtitle="Everything Selah is holding right now: money that belongs to users, and Selah’s own. The total is what the bank account should show."
        action={
          <ExportButton
            filename={`selah-balances-${today()}`}
            build={() => ({
              head: ['Line', 'Amount (KES)'],
              rows: [
                ...userLines.map((l) => [l.label, csvMoney(l.amount)]),
                ['User funds (total)', csvMoney(b.userFunds)],
                ['Fees earned', csvMoney(b.fees)],
                ['Earn rewards paid', csvMoney(-b.rewards as Minor)],
                ['Selah’s own (net)', csvMoney(b.own)],
                ['Expected bank balance', csvMoney(b.total)],
                ['Committed: approved rewards not yet paid', csvMoney(b.rewardsOwed)],
                ['Not yet earned: fees on held escrow', csvMoney(b.feesPending)],
              ],
            })}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="User funds" icon={<Users className="size-4" />} value={formatKES(b.userFunds, { compact: true })} hint="Owed to users; must stay ring-fenced" />
        <Stat label="Selah’s own" icon={<Landmark className="size-4" />} value={formatKES(b.own, { compact: true })} hint="Fees earned, less rewards paid" />
        <Stat label="Expected bank balance" icon={<Vault className="size-4" />} value={formatKES(b.total, { compact: true })} hint="User funds plus Selah’s own" />
      </div>

      <Card>
        <CardHeader title="Where the money sits" subtitle={`${formatKES(b.total)} in total. Hover a segment to pick it out.`} />
        <ShareBar
          segments={[
            { label: 'User wallets', hint: 'People and businesses', amount: (b.wallets.people + b.wallets.businesses) as Minor },
            { label: 'Escrow', hint: 'Held, fulfilled and disputed', amount: (b.escrow.FUNDS_HELD + b.escrow.FULFILLED + b.escrow.DISPUTED) as Minor },
            { label: 'Payouts in transit', hint: 'Reserved, awaiting review', amount: b.inTransit },
            { label: 'Selah’s own', hint: 'Fees less rewards', amount: b.own },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Owed to users" subtitle="Selah holds this on users’ behalf. It isn’t revenue." />
          <Breakdown lines={userLines} total={b.userFunds} totalLabel="User funds" />
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Selah’s own" />
            <Breakdown lines={ownLines} total={b.own} totalLabel="Net" />
          </Card>
          <Card>
            <CardHeader title="Coming up" subtitle="Not in the totals yet." />
            <Breakdown
              lines={[
                { label: 'Fees on held escrow', hint: 'Moves into Selah’s own when the escrow releases; lost if refunded', amount: b.feesPending },
                { label: 'Approved rewards not yet paid', hint: <Link href="/admin/earn" className="hover:text-brand">Will come out of Selah’s own</Link>, amount: b.rewardsOwed, minus: true },
              ]}
              total={(b.feesPending - b.rewardsOwed) as Minor}
              totalLabel="Net effect on Selah’s own"
            />
          </Card>
        </div>
      </div>

      <section>
        <CardHeader title="Largest wallets" subtitle="Where user money sits. Escrow shown is the seller’s share still on hold." />
        <Table
          head={['Account', 'Wallet', 'Pending in escrow']}
          empty="No wallets hold money."
          rows={top.map((x) => [
            <PartyLink key="p" world={w} party={x.party} />,
            <Money key="b" amount={x.balance} className="font-medium" />,
            <Money key="h" amount={heldFor(w, x.party)} className="text-muted" />,
          ])}
        />
      </section>
    </div>
  );
}
