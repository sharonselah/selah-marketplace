'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronRight, Link2, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, Card, IconCircle, Money, StatusPill } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { ProcessingSteps } from '@/components/ui/Interactive';
import type { CreatorTier } from '@/lib/constants/enums';
import { CREATOR_TIER_LABEL, JOB_STATUS_LABEL, JOB_TONE, JOB_TYPE_LABEL, SOCIAL_PLATFORM_LABEL } from '@/lib/constants/labels';
import { formatCount, formatDate, kes } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { simulatedFollowers, type Social } from '@/lib/store/actions/creator';
import type { CreatorCampaign, CreatorProfile, Job, World } from '@/types';

const TIER_TONE: Record<CreatorTier, 'neutral' | 'info' | 'brand' | 'good' | 'warn'> = {
  NANO: 'neutral',
  MICRO: 'info',
  MACRO: 'brand',
  META: 'good',
  MEGA: 'warn',
};

export function TierBadge({ tier }: { tier: CreatorTier }) {
  return <Badge tone={TIER_TONE[tier]}>{CREATOR_TIER_LABEL[tier]}</Badge>;
}

const PLATFORMS = Object.keys(SOCIAL_PLATFORM_LABEL) as Social['platform'][];

/** Link social accounts; each link runs the simulated "fetch followers" check. */
export function SocialLinker({ value, onChange }: { value: Social[]; onChange: (v: Social[]) => void }) {
  const [platform, setPlatform] = useState<Social['platform']>('INSTAGRAM');
  const [handle, setHandle] = useState('');
  const [fetching, setFetching] = useState(false);
  const clean = handle.trim().replace(/^@?/, '@');
  const duplicate = value.some((s) => s.platform === platform);

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="flex flex-col gap-1">
          {value.map((s) => (
            <div key={s.platform} className="flex items-center gap-3 py-2.5">
              <IconCircle icon={<Link2 className="size-4" />} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">{SOCIAL_PLATFORM_LABEL[s.platform]} · {s.handle}</div>
                <div className="text-xs text-muted">{formatCount(s.followers)} followers</div>
              </div>
              <button type="button" className="text-muted hover:text-bad" aria-label={`Unlink ${SOCIAL_PLATFORM_LABEL[s.platform]}`} onClick={() => onChange(value.filter((x) => x !== s))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {fetching ? (
        <ProcessingSteps
          title={`Connecting ${SOCIAL_PLATFORM_LABEL[platform]}`}
          done="Account linked"
          steps={[`Authorising ${clean}`, 'Fetching followers…', 'Checking for fake followers']}
          stepMs={900}
          onDone={() => {
            onChange([...value, { platform, handle: clean, followers: simulatedFollowers(platform, clean) }]);
            setHandle('');
            setFetching(false);
          }}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <Field label="Platform">
            <Select value={platform} onChange={setPlatform} options={PLATFORMS.map((p) => ({ value: p, label: SOCIAL_PLATFORM_LABEL[p] }))} />
          </Field>
          <Field label="Handle">
            <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, ''))} placeholder="@yourhandle" />
          </Field>
          <Button variant="secondary" disabled={handle.replace('@', '').length < 2 || duplicate} onClick={() => setFetching(true)}>
            {duplicate ? 'Already linked' : 'Link account'}
          </Button>
        </div>
      )}
    </div>
  );
}

export type RateRow = { deliverable: string; price: string };

export const DEFAULT_RATE_CARD: RateRow[] = [
  { deliverable: 'Instagram reel', price: '3000' },
  { deliverable: 'TikTok video', price: '2500' },
  { deliverable: 'Story set (3)', price: '1500' },
  { deliverable: 'Product feedback survey', price: '1000' },
];

export const rateRowsFrom = (rc: CreatorProfile['rateCard']): RateRow[] => rc.map((r) => ({ deliverable: r.deliverable, price: String(r.price / 100) }));
export const rateCardFrom = (rows: RateRow[]): CreatorProfile['rateCard'] =>
  rows.filter((r) => r.deliverable.trim() && Number(r.price) > 0).map((r) => ({ deliverable: r.deliverable.trim(), price: kes(Number(r.price)) }));

export function RateCardEditor({ value, onChange }: { value: RateRow[]; onChange: (v: RateRow[]) => void }) {
  const set = (i: number, patch: Partial<RateRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      {value.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
          <Input value={r.deliverable} onChange={(e) => set(i, { deliverable: e.target.value })} placeholder="Deliverable" aria-label="Deliverable" />
          <Input prefix="KES" inputMode="numeric" value={r.price} onChange={(e) => set(i, { price: e.target.value.replace(/\D/g, '') })} aria-label="Price" />
          <button type="button" className="text-muted hover:text-bad" aria-label="Remove row" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => onChange([...value, { deliverable: '', price: '' }])}>
        Add deliverable
      </Button>
    </div>
  );
}

/** Brief, fee and deliverables of a campaign, as a creator sees it. */
export function CampaignBrief({ world, campaign, compact }: { world: World; campaign: CreatorCampaign; compact?: boolean }) {
  const brand = byId(world.businesses, campaign.brandId);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={brand?.name ?? 'Brand'} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-text">{campaign.title}</div>
          <div className="text-xs text-muted">{brand?.name} · {JOB_TYPE_LABEL[campaign.jobType]}</div>
        </div>
        <Money amount={campaign.feePerCreator} className="text-sm font-semibold text-text" />
      </div>
      <p className="text-sm text-muted">{campaign.brief}</p>
      {!compact && (
        <ul className="flex flex-col gap-1 text-sm text-text">
          {campaign.deliverables.map((d) => (
            <li key={d}>• {d}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {campaign.tiers.map((t) => (
          <TierBadge key={t} tier={t} />
        ))}
        <span className="flex items-center gap-1"><CalendarClock className="size-3.5" /> Due {formatDate(campaign.deadline)}</span>
        <span className="flex items-center gap-1"><Users className="size-3.5" /> {campaign.slots} creators</span>
      </div>
    </div>
  );
}

export function CampaignCard({ world, campaign, action }: { world: World; campaign: CreatorCampaign; action?: ReactNode }) {
  return (
    <Card>
      <CampaignBrief world={world} campaign={campaign} compact />
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </Card>
  );
}

export function JobRow({ world, job, hint }: { world: World; job: Job; hint?: string }) {
  const c = byId(world.campaigns, job.campaignId);
  const brand = c && byId(world.businesses, c.brandId);
  return (
    <Link href={`/creator/jobs/${job.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
      <Avatar name={brand?.name ?? 'Brand'} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{c?.title}</div>
        <div className="truncate text-xs text-muted">{brand?.name} · {job.jobType === 'INFLUENCE' ? 'Influence' : 'Insights'}{hint ? ` · ${hint}` : ''}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Money amount={job.fee} className="text-sm font-semibold text-text" />
        <StatusPill status={job.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[job.status]} />
      </div>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );
}
