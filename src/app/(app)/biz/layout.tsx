'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Building2, Lock } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { CAPABILITY_DESCRIPTION, CAPABILITY_LABEL } from '@/lib/constants/labels';
import { businessRef, byId, capabilityForPath } from '@/lib/selectors';
import { switchAccount } from '@/lib/store/actions/auth';
import { useViewer } from '@/lib/store/hooks';

/** /biz is for acting as a business. Each screen is gated by the capability its panel belongs to. */
export default function BizLayout({ children }: { children: ReactNode }) {
  const { world, me, business } = useViewer();
  const pathname = usePathname();
  const router = useRouter();

  if (!business) {
    const first = byId(world.businesses, me.businessIds[0]);
    return first ? (
      <EmptyState icon={<Building2 className="size-8" />} title="Switch to your business" body="Business tools belong to your business account." action={<Button onClick={() => { switchAccount(businessRef(first.id)); router.refresh(); }}>Act as {first.name}</Button>} />
    ) : (
      <EmptyState icon={<Building2 className="size-8" />} title="No business account yet" body="Clubs, organisers and brands sell and buy on Selah through a Business Account." action={<LinkButton href="/onboarding/business">Add Business Account</LinkButton>} />
    );
  }

  const cap = capabilityForPath(pathname);
  if (cap && !business.capabilities.includes(cap)) {
    return (
      <EmptyState
        icon={<Lock className="size-8" />}
        title={`${CAPABILITY_LABEL[cap]} is off`}
        body={`${CAPABILITY_DESCRIPTION[cap]} Turn it on in Business settings to use this screen.`}
        action={<LinkButton href="/biz/settings#capabilities">Open Business settings</LinkButton>}
      />
    );
  }
  return <>{children}</>;
}
