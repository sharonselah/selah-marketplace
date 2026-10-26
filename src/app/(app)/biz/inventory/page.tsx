'use client';

import { useState } from 'react';
import { Box, Pencil, Plus, Trash2 } from 'lucide-react';
import { InventoryFormModal } from '@/components/shared/InventoryForm';
import { ReadinessBanner } from '@/components/shared/Business';
import { Button } from '@/components/ui/Button';
import { Badge, Card, EmptyState, Money, Orb, PageHeader, StatusPill } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { INVENTORY_TYPE, type InventoryType } from '@/lib/constants/enums';
import { AD_SLOT_TONE, INVENTORY_TYPE_LABEL, TICKET_TIER_LABEL } from '@/lib/constants/labels';
import { byId } from '@/lib/selectors';
import { removeInventory } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';
import type { InventoryItem } from '@/types';

function detail(item: InventoryItem, eventTitle?: string): string {
  switch (item.type) {
    case 'TABLE':
      return `Seats ${item.capacity} · ${item.available} available${item.perks.length ? ` · ${item.perks.join(', ')}` : ''}`;
    case 'DRINK_PREORDER':
      return item.description;
    case 'TICKET':
      return `${eventTitle ?? 'Event'} · ${TICKET_TIER_LABEL[item.tier]} · ${item.sold}/${item.capacity} sold`;
    case 'AD_SLOT':
      return `${item.screen} · ${item.slotLengthSec}s · ~${item.reachEstimate.toLocaleString('en-KE')} people/night`;
  }
}

/** Sold or booked items stay put: orders and campaigns point at them. */
const locked = (i: InventoryItem) => (i.type === 'TICKET' && i.sold > 0) || (i.type === 'AD_SLOT' && i.status === 'BOOKED');

export default function InventoryPage() {
  const { world, business } = useViewer();
  const b = business!;
  const [tab, setTab] = useState<InventoryType>('TABLE');
  const [editing, setEditing] = useState<{ item?: InventoryItem } | null>(null);
  const mine = world.inventory.filter((i) => i.venueId === b.id);
  const events = world.events.filter((e) => e.venueId === b.id && e.status !== 'CANCELLED' && e.status !== 'COMPLETED');
  const items = mine.filter((i) => i.type === tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory" subtitle="Everything guests and brands can buy from you." action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing({})} disabled={tab === 'TICKET' && !events.length}>Add {INVENTORY_TYPE_LABEL[tab].toLowerCase()}</Button>} />
      <ReadinessBanner business={b} />
      <Tabs value={tab} onChange={setTab} tabs={INVENTORY_TYPE.map((t) => ({ value: t, label: INVENTORY_TYPE_LABEL[t], count: mine.filter((i) => i.type === t).length }))} />
      {items.length === 0 ? (
        <EmptyState
          icon={<Box className="size-8" />}
          title={`No ${INVENTORY_TYPE_LABEL[tab].toLowerCase()}s yet`}
          body={tab === 'TICKET' ? (events.length ? 'Add ticket tiers to an event.' : 'Create an event first, then add ticket tiers to it.') : 'Add one and it shows on your venue page straight away.'}
        />
      ) : (
        <Card padded={false}>
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <Orb name={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm font-medium text-text">
                    {item.name}
                    {item.type === 'AD_SLOT' && <StatusPill status={item.status} tones={AD_SLOT_TONE} />}
                    {item.type === 'TABLE' && item.available === 0 && <Badge tone="bad">Fully booked</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted">{detail(item, item.type === 'TICKET' ? byId(world.events, item.eventId)?.title : undefined)}</div>
                </div>
                <Money amount={item.price} className="text-sm font-semibold text-text" />
                <button className="rounded-tile p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Edit ${item.name}`} onClick={() => setEditing({ item })}>
                  <Pencil className="size-4" />
                </button>
                <button className="rounded-tile p-2 text-muted hover:bg-surface-2 hover:text-bad disabled:opacity-30" aria-label={`Remove ${item.name}`} disabled={locked(item)} title={locked(item) ? 'Already sold or booked' : undefined} onClick={() => confirm(`Remove ${item.name}?`) && removeInventory(item.id)}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {editing && <InventoryFormModal open onClose={() => setEditing(null)} venueId={b.id} type={editing.item?.type ?? tab} item={editing.item} events={events} />}
    </div>
  );
}
