'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Table } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, PageHeader } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { staleCreators } from '@/lib/admin';
import { CREATOR_TIER } from '@/lib/constants/enums';
import { CREATOR_TIER_LABEL, SOCIAL_PLATFORM_LABEL } from '@/lib/constants/labels';
import { formatCount, formatDate, timeAgo } from '@/lib/format';
import { artists, currentPolicy, tierIsStale } from '@/lib/selectors';
import { recheckTier } from '@/lib/store/actions/creator';
import { useWorld } from '@/lib/store/hooks';

export default function AdminCreatorsPage() {
  const w = useWorld();
  const p = currentPolicy(w);
  const [tab, setTab] = useState<'STALE' | 'ALL'>('STALE');
  const stale = staleCreators(w);
  const list = tab === 'STALE' ? stale : artists(w).filter((a) => a.creator);

  return (
    <div>
      <PageHeader
        title="Creator tiers"
        subtitle={`Tiers come from follower counts and are rechecked every ${p.tierRecheckDays} days. Thresholds: ${CREATOR_TIER.map((t) => `${CREATOR_TIER_LABEL[t]} ${formatCount(p.tierThresholds[t])}+`).join(' · ')}.`}
        action={
          stale.length > 0 && (
            <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => { stale.forEach((a) => recheckTier(a.id)); toast(`Rechecked ${stale.length} creators`); }}>
              Recheck all due ({stale.length})
            </Button>
          )
        }
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'STALE', label: 'Recheck queue', count: stale.length }, { value: 'ALL', label: 'All creators' }]} />
      <Table
        head={['Creator', 'Tier', 'Followers', 'Socials', 'Last verified', '']}
        empty="Every creator’s tier is fresh."
        rows={list.map((a) => {
          const c = a.creator!;
          const due = tierIsStale(c, p);
          return [
            <Link key="a" href={`/admin/people/${a.personId}`} className="flex items-center gap-3 hover:text-brand">
              <Avatar name={a.stageName} size="sm" />
              <span className="font-medium">{a.stageName}</span>
            </Link>,
            <Badge key="t" tone="brand">{CREATOR_TIER_LABEL[c.tier]}</Badge>,
            formatCount(c.followerCount),
            <span key="s" className="text-xs text-muted">{c.socials.map((s) => `${SOCIAL_PLATFORM_LABEL[s.platform]} @${s.handle}`).join(', ')}</span>,
            <span key="v" className="flex flex-col">
              <span>{formatDate(c.tierLastVerifiedAt)}</span>
              <span className={due ? 'text-xs text-warn' : 'text-xs text-muted'}>{due ? `Due · ${timeAgo(c.tierLastVerifiedAt)}` : timeAgo(c.tierLastVerifiedAt)}</span>
            </span>,
            <Button key="b" size="sm" variant={due ? 'primary' : 'ghost'} onClick={() => { recheckTier(a.id); toast(`${a.stageName} rechecked`); }}>
              Recheck
            </Button>,
          ];
        })}
      />
    </div>
  );
}
