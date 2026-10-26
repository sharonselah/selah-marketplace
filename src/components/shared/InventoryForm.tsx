'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { TICKET_TIER, type InventoryType, type TicketTier } from '@/lib/constants/enums';
import { INVENTORY_TYPE_LABEL, TICKET_TIER_LABEL } from '@/lib/constants/labels';
import { kes } from '@/lib/format';
import { businessRef } from '@/lib/selectors';
import { saveInventory, type InventoryDraft } from '@/lib/store/actions/venue';
import { PayoutPreview } from './Escrow';
import type { SelahEvent, BusinessId, EventId, InventoryItem } from '@/types';

const digits = (v: string) => v.replace(/\D/g, '');

/** Create or edit any inventory type. Tickets need an event; pass `eventId` to lock it. */
export function InventoryFormModal({
  open,
  onClose,
  venueId,
  type,
  item,
  events,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  venueId: BusinessId;
  type: InventoryType;
  item?: InventoryItem;
  events: SelahEvent[];
  eventId?: EventId;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price / 100) : '');
  const [capacity, setCapacity] = useState(item && 'capacity' in item ? String(item.capacity) : '');
  const [available, setAvailable] = useState(item?.type === 'TABLE' ? String(item.available) : '1');
  const [perks, setPerks] = useState(item?.type === 'TABLE' ? item.perks.join(', ') : '');
  const [description, setDescription] = useState(item?.type === 'DRINK_PREORDER' ? item.description : '');
  const [event, setEvent] = useState<EventId | ''>(item?.type === 'TICKET' ? item.eventId : (eventId ?? ''));
  const [tier, setTier] = useState<TicketTier>(item?.type === 'TICKET' ? item.tier : 'REGULAR');
  const [screen, setScreen] = useState(item?.type === 'AD_SLOT' ? item.screen : '');
  const [reach, setReach] = useState(item?.type === 'AD_SLOT' ? String(item.reachEstimate) : '');
  const [length, setLength] = useState(item?.type === 'AD_SLOT' ? String(item.slotLengthSec) : '30');
  const [error, setError] = useState<string | null>(null);

  const build = (): InventoryDraft | string => {
    const p = kes(Number(price));
    if (!Number(price)) return 'Set a price.';
    switch (type) {
      case 'TABLE':
        if (!name.trim() || !Number(capacity)) return 'Name the table and set how many guests it seats.';
        return { type, name: name.trim(), price: p, capacity: Number(capacity), available: Number(available), perks: perks.split(',').map((x) => x.trim()).filter(Boolean) };
      case 'DRINK_PREORDER':
        if (!name.trim()) return 'Name the bottle or package.';
        return { type, name: name.trim(), price: p, description: description.trim() || 'Pre-order and it’s chilled and waiting at your table.' };
      case 'TICKET': {
        const ev = events.find((e) => e.id === event);
        if (!ev || !Number(capacity)) return 'Pick an event and set the capacity.';
        return { type, name: `${ev.title}: ${TICKET_TIER_LABEL[tier]}`, price: p, eventId: ev.id, tier, capacity: Number(capacity) };
      }
      case 'AD_SLOT':
        if (!name.trim() || !screen.trim() || !Number(reach)) return 'Describe the slot, the screen and the nightly reach.';
        return { type, name: name.trim(), price: p, screen: screen.trim(), reachEstimate: Number(reach), slotLengthSec: Number(length) };
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${item ? 'Edit' : 'Add'} ${INVENTORY_TYPE_LABEL[type].toLowerCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              const d = build();
              if (typeof d === 'string') return setError(d);
              saveInventory(venueId, d, item?.id);
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {type === 'TICKET' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event">
              <Select value={event} onChange={setEvent} placeholder="Choose an event" options={events.map((e) => ({ value: e.id, label: e.title }))} />
            </Field>
            <Field label="Tier">
              <Select value={tier} onChange={setTier} options={TICKET_TIER.map((t) => ({ value: t, label: TICKET_TIER_LABEL[t] }))} />
            </Field>
          </div>
        ) : (
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={{ TABLE: 'e.g. VIP booth', DRINK_PREORDER: 'e.g. Hennessy VS', AD_SLOT: 'e.g. Main screen: prime time', TICKET: '' }[type]} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Field label={type === 'AD_SLOT' ? 'Price per night (KES)' : 'Price (KES)'}>
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(digits(e.target.value))} />
            </Field>
            <PayoutPreview amount={kes(Number(price))} payee={businessRef(venueId)} feeType={type === 'AD_SLOT' ? 'AD_BROKER_SHARE' : undefined} />
          </div>
          {(type === 'TABLE' || type === 'TICKET') && (
            <Field label={type === 'TABLE' ? 'Seats' : 'Capacity'}>
              <Input inputMode="numeric" value={capacity} onChange={(e) => setCapacity(digits(e.target.value))} />
            </Field>
          )}
          {type === 'AD_SLOT' && (
            <Field label="Slot length">
              <Select value={length} onChange={setLength} options={['15', '30', '60'].map((s) => ({ value: s, label: `${s} seconds` }))} />
            </Field>
          )}
        </div>
        {type === 'TABLE' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How many of these tables">
              <Input inputMode="numeric" value={available} onChange={(e) => setAvailable(digits(e.target.value))} />
            </Field>
            <Field label="Perks" hint="Comma separated">
              <Input value={perks} onChange={(e) => setPerks(e.target.value)} placeholder="Bottle of choice, dedicated waiter" />
            </Field>
          </div>
        )}
        {type === 'DRINK_PREORDER' && (
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What’s included, mixers, serving" />
          </Field>
        )}
        {type === 'AD_SLOT' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Screen">
              <Input value={screen} onChange={(e) => setScreen(e.target.value)} placeholder="Main LED wall" />
            </Field>
            <Field label="Nightly reach (people)">
              <Input inputMode="numeric" value={reach} onChange={(e) => setReach(digits(e.target.value))} />
            </Field>
          </div>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    </Modal>
  );
}
