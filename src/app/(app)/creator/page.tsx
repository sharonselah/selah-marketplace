'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, Briefcase, Inbox, PartyPopper, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { JobRow, RateCardEditor, SocialLinker, TierBadge, rateCardFrom, rateRowsFrom, type RateRow } from '@/components/shared/Creator';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Card, CardHeader, Money, PageHeader, Stat } from '@/components/ui/Display';
import { ProcessingSteps } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { CREATOR_NICHES } from '@/lib/data/pools';
import { formatCount, formatDate, formatKES, timeAgo } from '@/lib/format';
import { byId, currentPolicy, isPendingInvite, jobAwaitsCreator, payeeShare, tierIsStale } from '@/lib/selectors';
import { recheckTier, updateCreatorProfile } from '@/lib/store/actions/creator';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';

export default function CreatorProfilePage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const creator = artist.creator!;
  const welcome = useSearchParams().get('welcome') === '1';
  const [rechecking, setRechecking] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [rates, setRates] = useState<RateRow[]>(() => rateRowsFrom(creator.rateCard));
  const policy = currentPolicy(world);

  const jobs = world.jobs.filter((j) => j.artistId === artist.id);
  const invites = jobs.filter(isPendingInvite);
  const todo = jobs.filter((j) => jobAwaitsCreator(world, j) && j.status !== 'CANCELLED');
  const active = jobs.filter((j) => !isPendingInvite(j) && j.status !== 'PAID' && j.status !== 'CANCELLED');
  const held = jobs.reduce((a, j) => {
    const e = byId(world.escrows, j.escrowId);
    return e && (e.state === 'FUNDS_HELD' || e.state === 'FULFILLED') && !isPendingInvite(j) ? a + payeeShare(e) : a;
  }, 0) as Minor;
  const stale = tierIsStale(creator, policy);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Creator profile" subtitle={`${artist.stageName} · ${creator.niche.join(', ')}`} />

      {welcome && (
        <div className="flex items-center gap-3 rounded-card bg-good-soft p-4 text-good">
          <PartyPopper className="size-6 shrink-0" />
          <div>
            <div className="font-semibold">Creator services are live!</div>
            <div className="text-sm">
              Brands can now invite you. Browse <Link href="/creator/inbox?tab=open" className="underline">open campaigns</Link> to pitch your first job.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending invites" value={invites.length} icon={<Inbox className="size-4" />} />
        <Stat label="Active jobs" value={active.length} icon={<Briefcase className="size-4" />} />
        <Stat label="Held for jobs" value={<Money amount={held} />} hint="Released after the brand confirms" icon={<ShieldCheck className="size-4" />} />
        <Stat label="Followers" value={formatCount(creator.followerCount)} hint={creator.tier} icon={<Users className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Needs your attention" action={<Link href="/creator/jobs" className="text-sm text-brand hover:underline">All jobs</Link>} />
            {invites.length + todo.length === 0 ? (
              <p className="text-sm text-muted">You’re all caught up. Check open campaigns for new work.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {invites.map((j) => <JobRow key={j.id} world={world} job={j} hint="New invite" />)}
                {todo.map((j) => <JobRow key={j.id} world={world} job={j} />)}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Rate card" subtitle="Shown to brands in the creator directory" action={!editingRates && <Button size="sm" variant="ghost" onClick={() => setEditingRates(true)}>Edit</Button>} />
            {editingRates ? (
              <div className="flex flex-col gap-3">
                <RateCardEditor value={rates} onChange={setRates} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!rateCardFrom(rates).length}
                    onClick={() => {
                      updateCreatorProfile(artist.id, { rateCard: rateCardFrom(rates) });
                      setEditingRates(false);
                      toast('Rate card saved');
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRates(rateRowsFrom(creator.rateCard)); setEditingRates(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {creator.rateCard.map((r) => (
                  <div key={r.deliverable} className="flex justify-between py-2.5 text-sm">
                    <span className="text-text">{r.deliverable}</span>
                    <span className="font-semibold text-text">{formatKES(r.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Niche" subtitle="Brands filter creators by niche (up to 3)" />
            <ChipSelect options={CREATOR_NICHES} value={creator.niche as (typeof CREATOR_NICHES)[number][]} onChange={(niche) => niche.length && updateCreatorProfile(artist.id, { niche })} max={3} />
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Verified tier" action={<TierBadge tier={creator.tier} />} />
          {rechecking ? (
            <ProcessingSteps
              title="Rechecking your tier"
              done="Tier updated"
              steps={creator.socials.map((s) => `Fetching ${s.handle} followers…`).concat('Assigning tier')}
              stepMs={900}
              onDone={() => {
                recheckTier(artist.id);
                setRechecking(false);
                toast('Follower count refreshed');
              }}
            />
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <div className="text-title text-text">{formatCount(creator.followerCount)} <span className="text-base font-normal text-muted">followers</span></div>
              <div className="text-muted">Last verified {timeAgo(creator.tierLastVerifiedAt)} ({formatDate(creator.tierLastVerifiedAt)})</div>
              {stale && (
                <p className="flex items-start gap-2 text-warn">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Your tier is due for a recheck (every {policy.tierRecheckDays} days). Some brands only invite recently verified creators.
                </p>
              )}
              <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => setRechecking(true)}>
                Recheck now
              </Button>
            </div>
          )}
          <div className="mt-5 border-t border-border pt-5">
            <CardHeader title="Linked accounts" subtitle="Linking or unlinking rechecks your tier" />
            <SocialLinker
              value={creator.socials}
              onChange={(socials) => {
                if (!socials.length) return toast('Keep at least one linked account', 'info');
                recheckTier(artist.id, socials);
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
