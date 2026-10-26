'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Send, Users } from 'lucide-react';
import { TierBadge } from '@/components/shared/Creator';
import { FundJobModal } from '@/components/shared/FundJobModal';
import { Button, LinkButton } from '@/components/ui/Button';
import { Avatar, Badge, Card, EmptyState, Money, PageHeader } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { CREATOR_TIER, type CreatorTier } from '@/lib/constants/enums';
import { CREATOR_TIER_LABEL, SOCIAL_PLATFORM_LABEL } from '@/lib/constants/labels';
import { CREATOR_NICHES } from '@/lib/data/pools';
import { formatCount, kes } from '@/lib/format';
import { artists, byId, walletOf } from '@/lib/selectors';
import { inviteCreator } from '@/lib/store/actions/brand';
import { useViewer } from '@/lib/store/hooks';
import type { ArtistProfile, CampaignId, Minor } from '@/types';

export default function CreatorDirectory() {
  const { world, me, actingAs, business } = useViewer();
  const router = useRouter();
  const preset = useSearchParams().get('campaign') as CampaignId | null;
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<CreatorTier | 'ANY'>('ANY');
  const [niche, setNiche] = useState('ANY');
  const [inviting, setInviting] = useState<ArtistProfile | null>(null);
  const [funding, setFunding] = useState<{ artist: ArtistProfile; campaignId: CampaignId; fee: Minor } | null>(null);

  const campaigns = world.campaigns.filter((c) => c.brandId === business!.id && c.status === 'OPEN');
  const hired = (a: ArtistProfile, cid: CampaignId) => world.jobs.some((j) => j.campaignId === cid && j.artistId === a.id && j.status !== 'CANCELLED');
  const list = artists(world)
    .filter((a) => a.creator && a.personId !== me.id)
    .filter((a) => !q.trim() || a.stageName.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((a) => tier === 'ANY' || a.creator!.tier === tier)
    .filter((a) => niche === 'ANY' || a.creator!.niche.includes(niche))
    .sort((a, b) => b.creator!.followerCount - a.creator!.followerCount);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Creator directory" subtitle="Follower counts and tiers are verified from linked socials. Invite a creator straight into a campaign." />
      <div className="grid gap-3 rounded-card bg-surface shadow-card p-4 sm:grid-cols-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creators" />
        <Select<CreatorTier | 'ANY'> value={tier} onChange={setTier} options={[{ value: 'ANY', label: 'All tiers' }, ...CREATOR_TIER.map((t) => ({ value: t, label: CREATOR_TIER_LABEL[t] }))]} />
        <Select value={niche} onChange={setNiche} options={[{ value: 'ANY', label: 'All niches' }, ...CREATOR_NICHES.map((n) => ({ value: n, label: n }))]} />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="No creators match" body="Try another tier or niche." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const c = a.creator!;
            const from = c.rateCard.length ? (Math.min(...c.rateCard.map((r) => r.price)) as Minor) : null;
            return (
              <Card key={a.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={a.stageName} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text">{a.stageName}</div>
                    <div className="text-xs text-muted">{formatCount(c.followerCount)} followers · {a.location.split(',')[0]}</div>
                    <TierBadge tier={c.tier} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.niche.map((n) => <Badge key={n}>{n}</Badge>)}
                  {c.socials.map((s) => <Badge key={s.platform} tone="info">{SOCIAL_PLATFORM_LABEL[s.platform]}</Badge>)}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm text-muted">{from !== null ? <>from <Money amount={from} className="font-medium text-text" /></> : 'Rates on request'}</span>
                  <Button size="sm" variant="secondary" icon={<Send className="size-4" />} onClick={() => setInviting(a)}>Invite</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {inviting && (
        <InviteModal
          artist={inviting}
          campaigns={campaigns.filter((c) => !hired(inviting, c.id))}
          initial={preset}
          onClose={() => setInviting(null)}
          onNext={(campaignId, fee) => {
            setFunding({ artist: inviting, campaignId, fee });
            setInviting(null);
          }}
        />
      )}
      {funding && (
        <FundJobModal
          title={`Invite ${funding.artist.stageName}`}
          amount={funding.fee}
          balance={walletOf(world, actingAs)}
          phone={me.phone}
          intro={`The fee is held in escrow while ${funding.artist.stageName} decides. Declined invites are refunded in full.`}
          onClose={() => setFunding(null)}
          onPaid={(m) => {
            const jobId = inviteCreator(funding.campaignId, funding.artist.id, funding.fee, m);
            setFunding(null);
            toast(`Invite sent to ${funding.artist.stageName}`);
            if (jobId) router.push(`/biz/jobs/${jobId}`);
          }}
        />
      )}
      {campaigns.length === 0 && <p className="text-center text-sm text-muted">To invite creators you need an open campaign. <LinkButton variant="ghost" size="sm" href="/biz/campaigns/new">Create one</LinkButton></p>}
    </div>
  );
}

function InviteModal({ artist, campaigns, initial, onClose, onNext }: { artist: ArtistProfile; campaigns: { id: CampaignId; title: string; feePerCreator: Minor }[]; initial: CampaignId | null; onClose: () => void; onNext: (c: CampaignId, fee: Minor) => void }) {
  const start = campaigns.find((c) => c.id === initial) ?? campaigns[0];
  const [campaignId, setCampaignId] = useState<CampaignId | ''>(start?.id ?? '');
  const [fee, setFee] = useState(start ? String(start.feePerCreator / 100) : '');
  return (
    <Modal open onClose={onClose} title={`Invite ${artist.stageName}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!campaignId || !Number(fee)} onClick={() => onNext(campaignId as CampaignId, kes(Number(fee)))}>Continue to payment</Button></>}>
      {campaigns.length === 0 ? (
        <p className="text-sm text-muted">No open campaigns to invite {artist.stageName} to (or they’re already on all of them).</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Campaign">
            <Select
              value={campaignId}
              onChange={(v) => {
                setCampaignId(v);
                const c = campaigns.find((x) => x.id === v);
                if (c) setFee(String(c.feePerCreator / 100));
              }}
              options={campaigns.map((c) => ({ value: c.id, label: c.title }))}
            />
          </Field>
          <Field label="Fee (KES)" hint={byId(campaigns, campaignId) ? 'Defaults to the campaign’s fee per creator.' : undefined}>
            <Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
