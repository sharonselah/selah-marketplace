'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RequireSession } from '@/components/layout/Guards';
import { Logo } from '@/components/layout/Logo';
import { LinkButton } from '@/components/ui/Button';
import { useViewer } from '@/lib/store/hooks';

const NEXT_STEPS = [
  { href: '/wallet', title: 'Top up your wallet', body: 'Add money via M-Pesa for one-tap checkout.' },
  { href: '/discover', title: 'Find something tonight', body: 'Events, tables and artists near you.' },
  { href: '/earn', title: 'Earn with Selah', body: 'Share your referral code and earn rewards.' },
  { href: '/onboarding/artist', title: 'Are you an artist?', body: 'DJ, MC, musician or creator: start taking bookings.' },
  { href: '/onboarding/business', title: 'Run a venue or brand?', body: 'Add a Business Account to sell or advertise.' },
];

function Welcome() {
  const { me } = useViewer();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <Logo href="/home" />
      <h1 className="mt-12 text-title text-text">Karibu, {me.name.split(' ')[0]}!</h1>
      <p className="mt-2 text-muted">Your account is verified and ready. You’re a <span className="font-medium text-text">Patron</span>, so you can buy, book and earn straight away.</p>
      <p className="mt-3 text-sm text-muted">
        Phone verified · Referral code <span className="font-mono font-semibold text-text">{me.referralCode}</span>
      </p>

      <h2 className="mt-10 text-heading text-text">What’s next</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {NEXT_STEPS.map(({ href, title, body }) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-4 py-4">
              <span className="flex-1">
                <span className="block text-sm font-semibold text-text group-hover:text-brand">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </span>
              <ArrowRight className="size-4 text-muted group-hover:text-brand" />
            </Link>
          </li>
        ))}
      </ul>

      <LinkButton href="/home" size="lg" className="mt-8 self-start">
        Go to my home
      </LinkButton>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <RequireSession>
      <Welcome />
    </RequireSession>
  );
}
