'use client';

import { useState } from 'react';
import { Banknote, Gift, Landmark, PiggyBank, TrendingUp, Undo2 } from 'lucide-react';
import { Table } from '@/components/admin/AdminUI';
import { GmvChart, Legend, MONEY_OUT, MoneyOutChart, StreamChart } from '@/components/admin/ReportCharts';
import { ExportButton } from '@/components/shared/ExportButton';
import { Card, CardHeader, Money, PageHeader, Stat } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { periodReport, rewardReport, streamReport, type Period } from '@/lib/admin';
import { EARN_PROGRAMME_LABEL, humanize } from '@/lib/constants/labels';
import { csvMoney, today } from '@/lib/csv';
import { formatKES } from '@/lib/format';
import { useWorld } from '@/lib/store/hooks';
import type { Minor } from '@/types';

const STREAM_LABEL = { ORDER: 'Tickets, tables & store', BOOKING: 'Artist bookings', JOB: 'Creator jobs', AD_CAMPAIGN: 'Screen ads' } as const;
const sum = (xs: Minor[]) => xs.reduce((a, x) => a + x, 0) as Minor;

export default function AdminReportsPage() {
  const w = useWorld();
  const [period, setPeriod] = useState<Period>('WEEK');
  const rows = periodReport(w, period);
  const streams = streamReport(w);
  const rewards = rewardReport(w);
  const total = (k: 'gmv' | 'revenue' | 'rewards' | 'net' | 'refunds' | 'payouts') => sum(rows.map((r) => r[k]));
  const span = period === 'WEEK' ? 'last 8 weeks' : 'last 6 months';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue reports"
        subtitle="Platform money over time and by revenue stream. Figures come from the ledger; export for finance."
        action={<Tabs value={period} onChange={setPeriod} tabs={[{ value: 'WEEK', label: 'Weekly' }, { value: 'MONTH', label: 'Monthly' }]} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="GMV" value={formatKES(total('gmv'), { compact: true })} icon={<TrendingUp className="size-4" />} hint={`Funded, ${span}`} />
        <Stat label="Platform revenue" value={formatKES(total('revenue'), { compact: true })} icon={<Landmark className="size-4" />} hint="Fees on released escrows" />
        <Stat label="Earn rewards paid" value={formatKES(total('rewards'), { compact: true })} icon={<Gift className="size-4" />} hint="Selah’s cost: referrals, recruitment, models, lyrics" />
        <Stat label="Net revenue" value={formatKES(total('net'), { compact: true })} icon={<PiggyBank className="size-4" />} hint="Revenue less rewards paid" />
        <Stat label="Refunds" value={formatKES(total('refunds'), { compact: true })} icon={<Undo2 className="size-4" />} hint="Escrows returned to buyers" />
        <Stat label="Paid out" value={formatKES(total('payouts'), { compact: true })} icon={<Banknote className="size-4" />} hint="To sellers’ M-Pesa and bank" />
      </div>

      <section>
        <CardHeader
          title={period === 'WEEK' ? 'Week by week' : 'Month by month'}
          subtitle="GMV funded each period. Hover a bar for Selah’s fee and take rate."
          action={
            <ExportButton
              size="sm"
              filename={`selah-${period === 'WEEK' ? 'weekly' : 'monthly'}-report-${today()}`}
              build={() => ({
                head: ['Period starting', 'GMV (KES)', 'Platform revenue (KES)', 'Rewards paid (KES)', 'Net revenue (KES)', 'Refunds (KES)', 'Payouts (KES)', 'New accounts'],
                rows: rows.map((r) => [r.start.toISOString().slice(0, 10), csvMoney(r.gmv), csvMoney(r.revenue), csvMoney(r.rewards), csvMoney(r.net), csvMoney(r.refunds), csvMoney(r.payouts), r.signups]),
              })}
            />
          }
        />
        <Card className="mb-4">
          <GmvChart rows={rows} />
        </Card>
        <Table
          head={['Period', 'GMV', 'Revenue', 'Rewards', 'Net', 'Refunds', 'Payouts', 'New accounts']}
          rows={[...rows].reverse().map((r) => [
            <span key="p" className="whitespace-nowrap font-medium">{r.label}</span>,
            <Money key="g" amount={r.gmv} />,
            <Money key="r" amount={r.revenue} />,
            <Money key="w" amount={(-r.rewards) as Minor} className="text-muted" />,
            <Money key="n" amount={r.net} className="font-medium" />,
            <Money key="f" amount={r.refunds} className="text-muted" />,
            <Money key="o" amount={r.payouts} />,
            r.signups,
          ])}
        />
      </section>

      <Card>
        <CardHeader title="Money out" subtitle={`What left escrow, ${span}: released to sellers versus refunded to buyers.`} action={<Legend items={[...MONEY_OUT]} />} />
        <MoneyOutChart rows={rows} />
      </Card>

      <section>
        <CardHeader
          title="By revenue stream"
          subtitle="All time. Take rate is revenue over GMV."
          action={
            <ExportButton
              size="sm"
              filename={`selah-revenue-by-stream-${today()}`}
              build={() => ({
                head: ['Stream', 'Funded payments', 'GMV (KES)', 'Platform revenue (KES)', 'Refunds (KES)'],
                rows: streams.map((s) => [STREAM_LABEL[s.kind], s.count, csvMoney(s.gmv), csvMoney(s.revenue), csvMoney(s.refunds)]),
              })}
            />
          }
        />
        <Card className="mb-4">
          <StreamChart rows={streams.map((s) => ({ ...s, label: STREAM_LABEL[s.kind] }))} />
        </Card>
        <Table
          head={['Stream', 'Payments', 'GMV', 'Revenue', 'Take rate', 'Refunds']}
          rows={streams.map((s) => [
            <span key="k" className="flex flex-col"><span className="font-medium">{STREAM_LABEL[s.kind]}</span><span className="text-xs text-muted">{humanize(s.kind)} escrows</span></span>,
            s.count,
            <Money key="g" amount={s.gmv} />,
            <Money key="r" amount={s.revenue} className="font-medium" />,
            <span key="t" className="text-muted">{s.gmv ? `${((s.revenue / s.gmv) * 100).toFixed(1)}%` : '–'}</span>,
            <Money key="f" amount={s.refunds} className="text-muted" />,
          ])}
        />
      </section>

      <section>
        <CardHeader
          title="Earn rewards"
          subtitle="All time. Rewards come out of Selah’s own revenue, so they count as a cost. Approved rewards are committed but not yet paid."
          action={
            <ExportButton
              size="sm"
              filename={`selah-earn-rewards-${today()}`}
              build={() => ({
                head: ['Programme', 'Rewards paid', 'Paid (KES)', 'Approved, unpaid (KES)', 'In review (KES)'],
                rows: rewards.map((r) => [EARN_PROGRAMME_LABEL[r.programme], r.paidCount, csvMoney(r.paid), csvMoney(r.owed), csvMoney(r.pending)]),
              })}
            />
          }
        />
        <Table
          head={['Programme', 'Rewards paid', 'Paid', 'Approved, unpaid', 'In review']}
          rows={[
            ...rewards.map((r) => [
              <span key="p" className="font-medium">{EARN_PROGRAMME_LABEL[r.programme]}</span>,
              r.paidCount,
              <Money key="a" amount={r.paid} className="font-medium" />,
              <Money key="o" amount={r.owed} />,
              <Money key="r" amount={r.pending} className="text-muted" />,
            ]),
            [
              <span key="p" className="font-semibold">Total</span>,
              rewards.reduce((a, r) => a + r.paidCount, 0),
              <Money key="a" amount={sum(rewards.map((r) => r.paid))} className="font-semibold" />,
              <Money key="o" amount={sum(rewards.map((r) => r.owed))} className="font-semibold" />,
              <Money key="r" amount={sum(rewards.map((r) => r.pending))} className="text-muted" />,
            ],
          ]}
        />
      </section>
    </div>
  );
}
