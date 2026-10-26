'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Send } from 'lucide-react';
import { PayoutModal, TopUpModal } from '@/components/shared/WalletModals';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { TRANSACTION_TONE } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { heldFor, samePartyRef, walletOf } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';

type Filter = 'all' | 'in' | 'out';

export default function WalletPage() {
  const { world, me, actingAs, business } = useViewer();
  const params = useSearchParams();
  const [topup, setTopup] = useState(params.get('topup') === '1');
  const [payout, setPayout] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const balance = walletOf(world, actingAs);
  const held = heldFor(world, actingAs);
  const txns = world.transactions
    .filter((t) => samePartyRef(t.party, actingAs))
    .filter((t) => filter === 'all' || (filter === 'in' ? t.direction === 'IN' : t.direction === 'OUT'))
    .sort((a, b) => b.at.localeCompare(a.at));
  const payoutDest = business?.payout?.account ?? me.artist?.payout?.account ?? me.prefs?.payout?.account ?? me.phone;

  return (
    <div>
      <PageHeader title="Wallet" subtitle={business ? `${business.name}’s balance and transactions` : 'Your balance, top-ups and transaction history.'} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cover-g4 text-white md:col-span-2">
          <div className="text-label uppercase opacity-80">Available balance</div>
          <div className="mt-1 text-display">
            <Money amount={balance} />
          </div>
          {/* Glass buttons: the one place a hairline border is allowed, because on a gradient it is what reads as glass. */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="bg-white text-brand hover:bg-white/90" icon={<Plus className="size-4" />} onClick={() => setTopup(true)}>
              Top up
            </Button>
            <Button variant="ghost" className="bg-white/10 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/20" icon={<Send className="size-4" />} onClick={() => setPayout(true)} disabled={balance <= 0}>
              Withdraw
            </Button>
          </div>
        </Card>
        <Card>
          <div className="text-label text-muted uppercase">Pending in escrow</div>
          <div className="mt-1 text-title text-text">
            <Money amount={held} />
          </div>
          <p className="mt-2 text-xs text-muted">Money owed to you that’s still held until fulfilment (gigs, orders, jobs).</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Transactions" action={<Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All' }, { value: 'in', label: 'In' }, { value: 'out', label: 'Out' }]} />} />
        {txns.length === 0 ? (
          <EmptyState icon={<Receipt className="size-8" />} title="No transactions yet" body="Top up your wallet or make a purchase and it’ll show here." />
        ) : (
          <div className="flex flex-col gap-1">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${t.direction === 'IN' ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted'}`}>
                  {t.direction === 'IN' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{t.description}</div>
                  <div className="text-xs text-muted">{formatDateTime(t.at)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-sm font-semibold tabular-nums ${t.direction === 'IN' ? 'text-good' : 'text-text'}`}>
                    {t.direction === 'IN' ? '+' : '−'}
                    <Money amount={t.amount} />
                  </span>
                  <StatusPill status={t.status} tones={TRANSACTION_TONE} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <TopUpModal open={topup} onClose={() => setTopup(false)} party={actingAs} phone={me.phone} />
      {payout && <PayoutModal open onClose={() => setPayout(false)} party={actingAs} balance={balance} destination={payoutDest} />}
    </div>
  );
}
