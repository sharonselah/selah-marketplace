'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BadgeCheck, CalendarDays, Inbox, PartyPopper, ShieldCheck, Wallet } from 'lucide-react';
import { BookingList } from '@/components/shared/BookingList';
import { Button, LinkButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, Money, PageHeader, Stat } from '@/components/ui/Display';
import { ProcessingSteps } from '@/components/ui/Interactive';
import { ProgressBar } from '@/components/ui/Visuals';
import { VERIFICATION_LABEL } from '@/lib/constants/labels';
import { formatDateTime, formatPrice } from '@/lib/format';
import { BADGE_GIGS, heldFor, isCreator } from '@/lib/selectors';
import { requestVerifiedBadge } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';


export default function ArtistDashboard() {
  const { world, me, actingAs } = useViewer();
  const artist = me.artist!;
  const welcome = useSearchParams().get('welcome') === '1';
  const [checkingBadge, setCheckingBadge] = useState(false);

  const requests = world.bookingRequests.filter((r) => r.artistId === artist.id);
  const pending = requests.filter((r) => r.status === 'PENDING' || (r.status === 'NEGOTIATING' && r.counterOffers.at(-1)?.by === 'BUYER'));
  const bookings = world.bookings.filter((b) => b.artistId === artist.id);
  const upcoming = bookings.filter((b) => b.status === 'SCHEDULED' || b.status === 'CONTRACT_SIGNED' || b.status === 'AWAITING_SIGNATURES').sort((a, b) => a.date.localeCompare(b.date));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const earnedThisMonth = world.transactions.filter((t) => t.party.kind === 'PERSON' && t.party.id === me.id && t.direction === 'IN' && t.status === 'RELEASED' && t.at >= monthStart && t.ref.kind !== 'TOPUP').reduce((a, t) => a + t.amount, 0) as Minor;
  const held = heldFor(world, actingAs);
  const completedGigs = artist.gigsPlayed;
  const idVerified = artist.verification !== 'PHONE_VERIFIED';
  const badgeEligible = idVerified && completedGigs >= BADGE_GIGS;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Hey ${artist.stageName}`} subtitle="Your bookings, requests and earnings at a glance." action={<LinkButton href={`/artists/${artist.id}`} variant="outline">View public profile</LinkButton>} />

      {welcome && (
        <div className="flex items-center gap-3 rounded-card bg-good-soft p-4 text-good">
          <PartyPopper className="size-6 shrink-0" />
          <div>
            <div className="font-semibold">You’re live in the artist directory!</div>
            <div className="text-sm">Patrons, venues and organisers can now book you. Share your profile to get your first gig.</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending requests" value={pending.length} icon={<Inbox className="size-4" />} />
        <Stat label="Upcoming gigs" value={upcoming.length} icon={<CalendarDays className="size-4" />} />
        <Stat label="Held in escrow" value={<Money amount={held} />} hint="Released after each gig" icon={<ShieldCheck className="size-4" />} />
        <Stat label="Earned this month" value={<Money amount={earnedThisMonth} />} icon={<Wallet className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Needs your response" action={<Link href="/artist/gigs" className="text-sm text-brand hover:underline">All requests</Link>} />
            {pending.length === 0 ? <p className="text-sm text-muted">No pending requests. Nice and tidy.</p> : <BookingList world={world} requests={pending.slice(0, 4)} side="ARTIST" href={(r) => `/artist/gigs/${r.id}`} />}
          </Card>
          <Card>
            <CardHeader title="Upcoming gigs" action={<Link href="/artist/calendar" className="text-sm text-brand hover:underline">Calendar</Link>} />
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">No gigs scheduled yet. Send a proposal to a venue to get started.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {upcoming.slice(0, 5).map((b) => (
                  <Link key={b.id} href={`/artist/gigs/${b.requestId}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div>
                      <div className="text-sm font-medium text-text">{b.eventName}</div>
                      <div className="text-xs text-muted">{formatDateTime(b.date)} · {b.location.split(',')[0]}</div>
                    </div>
                    <Money amount={b.fee} className="text-sm font-semibold text-text" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="flex h-fit flex-col gap-5">
          <section className="pb-5">
            <CardHeader title="Verification" action={<Badge tone={artist.verification === 'VERIFIED_ARTIST' ? 'brand' : idVerified ? 'good' : 'warn'}>{VERIFICATION_LABEL[artist.verification]}</Badge>} />
            {artist.verification === 'VERIFIED_ARTIST' ? (
              <p className="flex items-start gap-2 text-sm text-muted"><BadgeCheck className="size-5 shrink-0 text-brand" /> You have the Verified Artist badge: top placement in search, higher-value bookings and faster payouts.</p>
            ) : checkingBadge ? (
              <ProcessingSteps title="Reviewing your profile" done="Badge approved" steps={['Checking ID verification', 'Reviewing completed gigs and ratings', 'Approving badge']} onDone={() => { requestVerifiedBadge(artist.id); setCheckingBadge(false); }} />
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted">ID verified</span>{idVerified ? <span className="text-good">Verified</span> : <span className="text-warn">Pending</span>}</div>
                <div>
                  <div className="mb-1 flex justify-between"><span className="text-muted">Completed gigs</span><span className="text-text">{Math.min(completedGigs, BADGE_GIGS)}/{BADGE_GIGS}</span></div>
                  <ProgressBar value={completedGigs} max={BADGE_GIGS} />
                </div>
                <Button variant="secondary" disabled={!badgeEligible} onClick={() => setCheckingBadge(true)}>
                  {badgeEligible ? 'Apply for Verified Artist badge' : 'Complete requirements to apply'}
                </Button>
              </div>
            )}
          </section>
          {!artist.creator && (
            <section className="py-5">
              <h3 className="font-semibold text-text">Work with brands</h3>
              <p className="mt-1 text-sm text-muted">{isCreator(artist) ? 'Link your socials to finish creator setup and start taking brand jobs.' : 'Get paid for posts, reels and product insights. Your follower tier is verified from your socials.'}</p>
              <LinkButton className="mt-3" variant="secondary" href="/onboarding/creator">{isCreator(artist) ? 'Finish creator setup' : 'Enable creator services'}</LinkButton>
            </section>
          )}
          <section className="pt-5">
            <CardHeader title="Your rates" action={<Link href="/artist/pricing" className="text-sm text-brand hover:underline">Edit</Link>} />
            <div className="text-title text-text">{formatPrice(artist.pricing.booking)}</div>
            <div className="mt-1 text-sm text-muted">Song request <Money amount={artist.pricing.songRequest} /> · Shout-out <Money amount={artist.pricing.shoutOut} /></div>
          </section>
        </Card>
      </div>
    </div>
  );
}
