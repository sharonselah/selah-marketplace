'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Check, CheckCircle2, Download, Flag, MapPin, ScanLine } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { DisputeModal } from '@/components/shared/DisputeModal';
import { EscrowPanel } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { QrCode, Timeline } from '@/components/ui/Visuals';
import { ORDER_TONE, PAYMENT_METHOD_LABEL } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import { checkInOrder } from '@/lib/store/actions/orders';
import { useViewer } from '@/lib/store/hooks';
import type { Minor, OrderId } from '@/types';

export default function OrderPage() {
  const { id } = useParams<{ id: OrderId }>();
  const isNew = useSearchParams().get('new') === '1';
  const { world, actingAs } = useViewer();
  const [dispute, setDispute] = useState(false);
  const order = byId(world.orders, id);
  if (!order) return <EmptyState title="Order not found" action={<BackLink href="/orders" />} />;

  const event = byId(world.events, order.eventId);
  const escrow = byId(world.escrows, order.escrowId)!;
  const isContent = !order.qrCode;
  const existingDispute = world.disputes.find((d) => d.escrowId === order.escrowId);
  const canDispute = !existingDispute && (order.status === 'PAID' || order.status === 'FULFILLED');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<BackLink href="/orders" label="My orders" />} title={event?.title ?? order.lines[0].name} subtitle={`Order ${order.id.slice(4).toUpperCase()} · ${formatDateTime(order.createdAt)}`} action={<StatusPill status={order.status} tones={ORDER_TONE} />} />

      {isNew && (
        <div className="mb-6 flex items-center gap-3 rounded-card bg-good-soft p-4 text-good">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <div className="font-semibold">{isContent ? 'Purchase complete!' : 'You’re going!'}</div>
            <div className="text-sm">{isContent ? 'Your download is ready below.' : 'We’ve sent your tickets by SMS too. Show this QR code at the door.'}</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Order status" />
            <Timeline steps={['PLACED', 'PAID', 'FULFILLED', 'COMPLETED'] as const} current={order.status === 'DISPUTED' || order.status === 'REFUNDED' ? 'PAID' : order.status} failed={order.status === 'DISPUTED' || order.status === 'REFUNDED' ? order.status : undefined} labels={{ FULFILLED: isContent ? 'Delivered' : 'Checked in' }} />
          </Card>
          <Card>
            <CardHeader title="Items" />
            <div className="flex flex-col gap-2 text-sm">
              {order.lines.map((l) => (
                <div key={l.itemId} className="flex justify-between gap-2">
                  <span className="text-text">{l.qty}× {l.name}</span>
                  <Money amount={(l.unit * l.qty) as Minor} className="text-muted" />
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <DefinitionList items={[['Seller', partyName(world, order.seller)], ['Paid with', PAYMENT_METHOD_LABEL[order.paymentMethod]], ['Total', <Money key="t" amount={order.total} />]]} />
            </div>
          </Card>
          <EscrowPanel escrow={escrow} />
          {existingDispute && (
            <Link href={`/disputes/${existingDispute.id}`} className="rounded-card bg-bad-soft p-4 text-sm text-bad">
              A dispute is open on this order: <span className="font-semibold underline">view progress</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {isContent ? (
            <Card className="text-center">
              <Download className="mx-auto size-8 text-brand" />
              <div className="mt-2 font-semibold text-text">{order.lines[0].name}</div>
              <Button block className="mt-4" icon={<Download className="size-4" />} onClick={() => toast('Download started (prototype: no real file)', 'info')}>
                Download
              </Button>
            </Card>
          ) : (
            <Card className="flex flex-col items-center text-center">
              <QrCode value={order.qrCode!} size={200} />
              <div className="mt-3 font-mono text-xs text-muted">{order.qrCode}</div>
              {event && (
                <div className="mt-3 text-sm text-text">
                  <div className="font-medium">{formatDateTime(event.date)}</div>
                  <div className="flex items-center justify-center gap-1 text-muted"><MapPin className="size-3.5" /> {partyName(world, order.seller)}</div>
                </div>
              )}
              {order.status === 'PAID' && (
                <Button
                  variant="secondary"
                  block
                  className="mt-4"
                  icon={<ScanLine className="size-4" />}
                  onClick={() => {
                    checkInOrder(order.id);
                    toast('Scanned at the door. Enjoy your night!');
                  }}
                >
                  Simulate door scan
                </Button>
              )}
              {order.status === 'FULFILLED' && <div className="mt-4 flex items-center gap-1 text-sm font-medium text-good"><Check className="size-4" /> Checked in</div>}
            </Card>
          )}
          {canDispute && (
            <Button variant="ghost" icon={<Flag className="size-4" />} onClick={() => setDispute(true)}>
              Report a problem / request refund
            </Button>
          )}
        </div>
      </div>
      <DisputeModal open={dispute} onClose={() => setDispute(false)} escrowId={order.escrowId} raisedBy={actingAs} />
    </div>
  );
}
