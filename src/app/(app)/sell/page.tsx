'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/Display';
import { useViewer } from '@/lib/store/hooks';

export default function SellPage() {
  const { me } = useViewer();
  const options = [
    {
      href: '/onboarding/artist',
      title: 'Add Artist role',
      body: 'For DJs, MCs, hosts, musicians, comedians, photographers, dancers and content creators.',
      points: ['Set your rates and take bookings', 'Sell mixes, sets and merch', 'Get paid for brand creator jobs'],
      done: !!me.artist,
    },
    {
      href: '/onboarding/business',
      title: 'Add Business Account',
      body: 'For clubs, bars, lounges, event organisers and brands.',
      points: ['Sell tables, tickets and bottle pre-orders', 'Book artists for your events', 'Advertise on venue screens & run creator campaigns'],
      done: false,
    },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Start selling on Selah" subtitle="Buying is free for everyone. To sell, add a role. Verification and a payout account are required before you go live." />
      <div className="grid gap-4 md:grid-cols-2">
        {options.map(({ href, title, body, points, done }) => (
          <Link key={href} href={done ? '/artist' : href} className="flex flex-col gap-4 rounded-card bg-surface p-6 shadow-card transition hover:shadow-raised">
            <div>
              <div className="text-heading text-text">{title}</div>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm text-text">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-good" /> {p}</li>
              ))}
            </ul>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand">{done ? 'You’re already an artist: open studio' : 'Get started'} <ArrowRight className="size-4" /></span>
          </Link>
        ))}
      </div>
      {!me.artist && (
        <p className="mt-6 text-center text-sm text-muted">
          Only want paid brand jobs, no gigs?{' '}
          <Link href="/onboarding/creator" className="font-medium text-brand hover:underline">Set up as a creator</Link>
        </p>
      )}
    </div>
  );
}
