'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, DefinitionList } from '@/components/ui/Display';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ProcessingSteps } from '@/components/ui/Interactive';
import { ARTIST_CATEGORY_LABEL } from '@/lib/constants/labels';
import { formatKES, formatPrice, kes, minPrice } from '@/lib/format';
import { requestBooking } from '@/lib/store/actions/bookings';
import type { ArtistProfile, PartyRef } from '@/types';

/** Booking request form used by patrons and by business accounts with BUY_ARTIST_BOOKINGS. */
export function BookingRequestForm({ artist, buyer, defaultLocation, detailHref }: { artist: ArtistProfile; buyer: PartyRef; defaultLocation: string; detailHref: (id: string) => string }) {
  const router = useRouter();
  const floor = minPrice(artist.pricing.booking);
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('21:00');
  const [duration, setDuration] = useState('4');
  const [location, setLocation] = useState(defaultLocation);
  const [offer, setOffer] = useState(String(floor / 100));
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (sending) {
    return (
      <Card className="mx-auto max-w-md">
        <ProcessingSteps
          title="Sending your request"
          done="Request sent!"
          steps={['Checking availability', `Sending request to ${artist.stageName}`, 'Notifying by SMS and in-app']}
          stepMs={900}
          onDone={() => {
            const id = requestBooking({
              artistId: artist.id,
              buyer,
              eventName: eventName.trim(),
              date: new Date(`${date}T${time}`).toISOString(),
              location: location.trim(),
              durationHours: Number(duration),
              offer: kes(Number(offer)),
              message: message.trim(),
            });
            router.replace(detailHref(id));
          }}
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader title="Event details" />
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!eventName.trim() || !date || !location.trim()) return setError('Fill in the event name, date and location.');
            if (Number(offer) <= 0) return setError('Enter your offer.');
            setError(null);
            setSending(true);
          }}
        >
          <Field label="What’s the occasion?">
            <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. 30th birthday party" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Duration">
              <Select value={duration} onChange={setDuration} options={['2', '3', '4', '5', '6'].map((h) => ({ value: h, label: `${h} hours` }))} />
            </Field>
          </div>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue or address" />
          </Field>
          <Field label="Your offer (KES)" hint={Number(offer) * 100 < floor ? `Below ${artist.stageName}’s usual rate. They may send a counter-offer.` : 'Within their usual rate.'}>
            <Input inputMode="numeric" value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Message">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Crowd size, music style, sound system, dress code…" />
          </Field>
          {error && <p className="text-sm text-bad">{error}</p>}
          <Button type="submit" size="lg">
            Send booking request
          </Button>
          <p className="text-xs text-muted">You won’t be charged until {artist.stageName} accepts and you both sign the contract. Payment is held in escrow until after the gig.</p>
        </form>
      </Card>
      <Card className="h-fit">
        <div className="flex items-center gap-3">
          <Avatar name={artist.stageName} size="lg" verified={artist.verification === 'VERIFIED_ARTIST'} />
          <div>
            <div className="font-semibold text-text">{artist.stageName}</div>
            <div className="text-xs text-muted">{ARTIST_CATEGORY_LABEL[artist.category]}</div>
          </div>
        </div>
        <div className="mt-4">
          <DefinitionList items={[['Usual rate', formatPrice(artist.pricing.booking)], ['Minimum', formatKES(floor)], ['Travels', `${artist.travelRadiusKm} km`]]} />
        </div>
      </Card>
    </div>
  );
}
