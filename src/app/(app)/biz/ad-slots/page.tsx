'use client';

import { useState } from 'react';
import { MonitorPlay, Pencil, Plus } from 'lucide-react';
import { InventoryFormModal } from '@/components/shared/InventoryForm';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Toggle } from '@/components/ui/Field';
import { AD_SLOT_TONE, ESCROW_LABEL, ESCROW_TONE } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { byId, payeeShare, samePartyRef } from '@/lib/selectors';
import { setAdSlotStatus } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';
import type { InventoryItem } from '@/types';

export default function AdSlotsPage() {
  const { world, actingAs, business } = useViewer();
  const b = business!;
  const [editing, setEditing] = useState<{ item?: InventoryItem } | null>(null);
  const slots = world.inventory.flatMap((i) => (i.venueId === b.id && i.type === 'AD_SLOT' ? [i] : []));
  const slotIds = new Set(slots.map((s) => s.id));
  const received = world.adCampaigns.filter((c) => c.slotIds.some((id) => slotIds.has(id))).sort((a, c) => c.startDate.localeCompare(a.startDate));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ad slots" subtitle="Sell screen time to brands. Selah brokers the deal and pays you when the run completes." action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing({})}>Add screen slot</Button>} />

      {slots.length === 0 ? (
        <EmptyState icon={<MonitorPlay className="size-8" />} title="No screens listed" body="List your LED walls and bar TVs. Brands see them in the ad marketplace with your reach estimate." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slots.map((s) => (
            <Card key={s.id}>
              <CardHeader title={s.name} subtitle={`${s.screen} · ${s.slotLengthSec}s spots`} action={<StatusPill status={s.status} tones={AD_SLOT_TONE} label={s.status === 'EXPIRED' ? 'Paused' : undefined} />} />
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-heading text-text"><Money amount={s.price} /><span className="text-sm font-normal text-muted"> / night</span></div>
                  <div className="text-xs text-muted">~{s.reachEstimate.toLocaleString('en-KE')} people per night</div>
                </div>
                <Button size="sm" variant="outline" icon={<Pencil className="size-4" />} onClick={() => setEditing({ item: s })}>Edit</Button>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                {s.status === 'BOOKED' ? (
                  <p className="text-sm text-muted">Booked by a brand. Availability changes once the run ends.</p>
                ) : (
                  <Toggle checked={s.status === 'AVAILABLE'} onChange={(on) => setAdSlotStatus(s.id, on ? 'AVAILABLE' : 'EXPIRED')} label={s.status === 'AVAILABLE' ? 'Listed in the ad marketplace' : 'Hidden from brands'} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Bookings received" subtitle="Campaigns running on your screens." />
        {received.length === 0 ? (
          <p className="text-sm text-muted">No brand has booked your screens yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {received.map((c) => {
              const escrow = c.escrowIds.map((id) => byId(world.escrows, id)).find((e) => e && samePartyRef(e.payee, actingAs));
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{c.name}</div>
                    <div className="text-xs text-muted">{byId(world.businesses, c.brandId)?.name} · {formatDate(c.startDate)} – {formatDate(c.endDate)} · {c.slotIds.filter((id) => slotIds.has(id)).length} of your slots</div>
                  </div>
                  {escrow && (
                    <div className="flex flex-col items-end gap-1">
                      <Money amount={payeeShare(escrow)} className="text-sm font-semibold text-text" />
                      <StatusPill status={escrow.state} tones={ESCROW_TONE} label={ESCROW_LABEL[escrow.state]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {editing && <InventoryFormModal open onClose={() => setEditing(null)} venueId={b.id} type="AD_SLOT" item={editing.item} events={[]} />}
    </div>
  );
}
