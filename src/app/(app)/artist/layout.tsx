'use client';

import type { ReactNode } from 'react';
import { Mic2 } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { isArtistSeller, personRef } from '@/lib/selectors';
import { switchAccount } from '@/lib/store/actions/auth';
import { useViewer } from '@/lib/store/hooks';

/** Artist studio is only for people with SELL_ARTIST_SERVICES, acting as themselves. */
export default function ArtistLayout({ children }: { children: ReactNode }) {
  const { me, actingAs } = useViewer();
  if (!isArtistSeller(me.artist)) {
    return <EmptyState icon={<Mic2 className="size-8" />} title="Artist studio" body="Add the Artist role to set your rates, take bookings and sell your mixes." action={<LinkButton href="/onboarding/artist">Add Artist role</LinkButton>} />;
  }
  if (actingAs.kind === 'BUSINESS') {
    return <EmptyState icon={<Mic2 className="size-8" />} title="Switch to your personal account" body="The artist studio belongs to your personal account." action={<Button onClick={() => switchAccount(personRef(me.id))}>Switch to {me.artist!.stageName}</Button>} />;
  }
  return <>{children}</>;
}
