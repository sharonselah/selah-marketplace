'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Money } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { cn } from '@/lib/cn';
import { kes, timeAgo } from '@/lib/format';
import type { BookingRequest, Minor } from '@/types';

export function NegotiationThread({ request, viewer, artistName, buyerName }: { request: BookingRequest; viewer: 'ARTIST' | 'BUYER'; artistName: string; buyerName: string }) {
  // After acceptance request.offer holds the agreed amount, so only show it on the opening bubble while no counters exist.
  const openingAmount = request.counterOffers.length ? undefined : request.offer;
  return (
    <Card>
      <CardHeader title="Offer & messages" />
      <div className="flex flex-col gap-3">
        <Bubble mine={viewer === 'BUYER'} who={buyerName} label="Offer" amount={openingAmount} at={request.createdAt} text={request.message || 'Booking request sent.'} />
        {request.counterOffers.map((c, i) => (
          <Bubble key={i} mine={c.by === viewer} who={c.by === 'ARTIST' ? artistName : buyerName} label="Counter-offer" amount={c.amount} at={c.at} text={c.note} />
        ))}
      </div>
    </Card>
  );
}

function Bubble({ mine, who, amount, at, text, label }: { mine: boolean; who: string; amount?: Minor; at: string; text: string; label: string }) {
  return (
    <div className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      <div className="text-xs text-muted">
        {mine ? 'You' : who} · {timeAgo(at)}
      </div>
      <div className={cn('max-w-[85%] rounded-card px-4 py-2.5 text-sm', mine ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text')}>
        {amount !== undefined && (
          <div className="mb-1 font-semibold">
            {label}: <Money amount={amount} />
          </div>
        )}
        {text}
      </div>
    </div>
  );
}

export function CounterModal({ open, onClose, onSubmit, suggested }: { open: boolean; onClose: () => void; onSubmit: (amount: Minor, note: string) => void; suggested: Minor }) {
  const [amount, setAmount] = useState(String(suggested / 100));
  const [note, setNote] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Make a counter-offer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!Number(amount)}
            onClick={() => {
              onSubmit(kes(Number(amount)), note.trim() || 'Here’s my counter-offer.');
              onClose();
            }}
          >
            Send counter-offer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Amount (KES)">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your number" />
        </Field>
      </div>
    </Modal>
  );
}
