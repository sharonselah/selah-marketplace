'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { isCreator, personRef } from '@/lib/selectors';
import { switchAccount } from '@/lib/store/actions/auth';
import { useViewer } from '@/lib/store/hooks';

/** Creator panels need SELL_CREATOR_SERVICES with a verified creator profile, acting as yourself. */
export default function CreatorLayout({ children }: { children: ReactNode }) {
  const { me, actingAs } = useViewer();
  if (!isCreator(me.artist) || !me.artist?.creator) {
    return (
      <EmptyState
        icon={<Sparkles className="size-8" />}
        title={isCreator(me.artist) ? 'Finish your creator setup' : 'Creator services'}
        body="Link your socials to get your follower tier verified, then take paid brand jobs: posts, reels and product insights."
        action={<LinkButton href="/onboarding/creator">{isCreator(me.artist) ? 'Finish setup' : 'Enable creator services'}</LinkButton>}
      />
    );
  }
  if (actingAs.kind === 'BUSINESS') {
    return <EmptyState icon={<Sparkles className="size-8" />} title="Switch to your personal account" body="Creator jobs belong to your personal account." action={<Button onClick={() => switchAccount(personRef(me.id))}>Switch to {me.artist.stageName}</Button>} />;
  }
  return <>{children}</>;
}
