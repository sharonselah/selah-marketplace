'use client';

import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { PaymentMethodPicker, PaymentProcessing, paymentBlocked } from '@/components/shared/Payment';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Money, PageHeader } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { ProgressBar } from '@/components/ui/Visuals';
import type { PaymentMethod } from '@/lib/constants/enums';
import { formatCount, formatDate, kes } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { createPromo } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { ContentId } from '@/types';

export default function PromoPage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const content = world.content.filter((c) => c.artistId === artist.id);
  const promos = world.promos.filter((p) => p.artistId === artist.id);
  const [contentId, setContentId] = useState<ContentId | 'profile'>('profile');
  const [budget, setBudget] = useState('1000');
  const [days, setDays] = useState('7');
  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = kes(Number(budget) || 0);
  const estReach = Math.round((Number(budget) || 0) * 4.2);
  const title = contentId === 'profile' ? `Boost: ${artist.stageName} profile` : `Boost: ${byId(world.content, contentId)?.title}`;

  return (
    <div>
      <PageHeader title="Promo" subtitle="Pay to promote your profile or a release across Selah. You’re the buyer here." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="mb-3 text-base font-semibold text-text">Your campaigns</h2>
          {promos.length === 0 ? (
            <EmptyState icon={<Megaphone className="size-8" />} title="No promos yet" body="Boost a mix or your profile to reach more fans and bookers." />
          ) : (
            <div className="flex flex-col gap-3">
              {promos.map((p) => {
                const target = Math.round((p.budget / 100) * 4.2);
                return (
                  <Card key={p.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-text">{p.title}</div>
                        <div className="text-xs text-muted">{formatDate(p.createdAt)} · {p.days} days · <Money amount={p.budget} /></div>
                      </div>
                      <Badge tone={p.status === 'ACTIVE' ? 'good' : 'neutral'}>{p.status === 'ACTIVE' ? 'Running' : 'Completed'}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                      <div><div className="font-semibold text-text">{formatCount(p.impressions)}</div><div className="text-xs text-muted">Impressions</div></div>
                      <div><div className="font-semibold text-text">{formatCount(p.clicks)}</div><div className="text-xs text-muted">Clicks</div></div>
                      <div><div className="font-semibold text-text">{p.impressions ? ((p.clicks / p.impressions) * 100).toFixed(1) : '0.0'}%</div><div className="text-xs text-muted">CTR</div></div>
                    </div>
                    <ProgressBar className="mt-3" value={p.impressions} max={target} />
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="New promo" />
          {paying ? (
            <PaymentProcessing method={method} amount={amount} phone={me.phone} escrow={false} onDone={() => { createPromo(artist.id, { title, contentId: contentId === 'profile' ? undefined : contentId, budget: amount, days: Number(days), method }); setPaying(false); toast('Promo is live'); }} />
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="What to promote">
                <Select value={contentId} onChange={setContentId} options={[{ value: 'profile' as const, label: 'My artist profile' }, ...content.map((c) => ({ value: c.id, label: c.title }))]} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget (KES)">
                  <Input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="Duration">
                  <Select value={days} onChange={setDays} options={['3', '7', '14', '30'].map((d) => ({ value: d, label: `${d} days` }))} />
                </Field>
              </div>
              <p className="text-sm text-muted">Estimated reach: <span className="font-semibold text-text">{formatCount(estReach)}</span> people</p>
              <PaymentMethodPicker value={method} onChange={(m) => { setMethod(m); setError(null); }} walletBalance={me.wallet.balance} amount={amount} />
              {error && <p className="text-sm text-bad">{error}</p>}
              <Button
                block
                disabled={amount < kes(200)}
                onClick={() => {
                  const b = paymentBlocked(method, amount, me.wallet.balance);
                  if (b) return setError(b);
                  setPaying(true);
                }}
              >
                Launch promo
              </Button>
              <p className="text-center text-xs text-muted">Minimum KES 200</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
