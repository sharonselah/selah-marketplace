'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { PaymentMethodPicker, PaymentProcessing, paymentBlocked } from '@/components/shared/Payment';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Money, PageHeader } from '@/components/ui/Display';
import type { PaymentMethod } from '@/lib/constants/enums';
import { byId, partyName, walletOf } from '@/lib/selectors';
import { placeOrder, priceCart, type CartLine } from '@/lib/store/actions/orders';
import { useViewer } from '@/lib/store/hooks';
import type { ContentId, InventoryId, Minor } from '@/types';

function parseItems(raw: string | null): CartLine[] {
  if (!raw) return [];
  return raw.split(',').flatMap((pair) => {
    const [itemId, qty] = pair.split(':');
    const n = Number(qty);
    return itemId && n > 0 ? [{ itemId: itemId as InventoryId | ContentId, qty: n }] : [];
  });
}

export default function CheckoutPage() {
  const { world, me, actingAs } = useViewer();
  const router = useRouter();
  const params = useSearchParams();
  const [cart] = useState(() => parseItems(params.get('items')));
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lines, total, seller, eventId, isContent } = priceCart(world, cart);
  if (!lines.length || !seller) return <EmptyState title="Your cart is empty" body="Pick something to buy first." action={<BackLink href="/discover" label="Back to Discover" />} />;

  const event = byId(world.events, eventId);
  const balance = walletOf(world, actingAs);

  if (paying) {
    return (
      <div className="mx-auto max-w-md py-8">
        <PaymentProcessing
          method={method}
          amount={total}
          phone={me.phone}
          onDone={() => {
            const id = placeOrder(actingAs, cart, method);
            router.replace(`/orders/${id}?new=1`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Checkout" back={<BackLink href={event ? `/events/${event.id}` : '/discover'} />} subtitle={`Buying from ${partyName(world, seller)}`} />
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Pay with" />
            <PaymentMethodPicker value={method} onChange={(m) => { setMethod(m); setError(null); }} walletBalance={balance} amount={total} />
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader title={event?.title ?? (isContent ? 'Digital purchase' : 'Order summary')} />
          <div className="flex flex-col gap-2 text-sm">
            {lines.map((l) => (
              <div key={l.itemId} className="flex justify-between gap-2 text-muted">
                <span>{l.qty}× {l.name}</span>
                <Money amount={(l.unit * l.qty) as Minor} />
              </div>
            ))}
            <div className="flex justify-between text-muted">
              <span>Service fee</span>
              <span>Included</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-semibold text-text">
            <span>Total</span>
            <Money amount={total} />
          </div>
          {error && <div className="mt-3 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
          <Button
            block
            size="lg"
            className="mt-4"
            onClick={() => {
              const blocked = paymentBlocked(method, total, balance);
              if (blocked) return setError(blocked);
              setPaying(true);
            }}
          >
            Pay <Money amount={total} />
          </Button>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0" /> {isContent ? 'Delivered instantly. The artist is paid after delivery.' : 'Your money is held in escrow and released to the venue only after you check in.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
