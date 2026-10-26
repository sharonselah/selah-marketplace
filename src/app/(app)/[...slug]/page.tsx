'use client';

import { usePathname } from 'next/navigation';
import { Construction } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';

// Catch-all for screens not built yet, so navigation never dead-ends during the build.
const PHASE_BY_PREFIX: [string, string][] = [];

export default function ComingSoon() {
  const path = usePathname();
  const phase = PHASE_BY_PREFIX.find(([p]) => path.startsWith(p))?.[1];
  return (
    <EmptyState
      icon={<Construction className="size-8" />}
      title="This screen is coming soon"
      body={phase ? `It’s scheduled for ${phase} of the prototype build.` : 'This page doesn’t exist.'}
      action={<LinkButton href="/home">Back home</LinkButton>}
    />
  );
}
