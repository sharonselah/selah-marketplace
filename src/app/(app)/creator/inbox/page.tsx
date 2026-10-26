'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Check, Loader2, Send, X } from 'lucide-react';
import { CampaignBrief, CampaignCard, TierBadge } from '@/components/shared/Creator';
import { PayoutPreview } from '@/components/shared/Escrow';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { Timeline } from '@/components/ui/Visuals';
import { PROPOSAL_TONE } from '@/lib/constants/labels';
import { formatKES, kes, timeAgo } from '@/lib/format';
import { byId, currentPolicy, isPendingInvite, personRef } from '@/lib/selectors';
import { respondToInvite, submitProposal } from '@/lib/store/actions/creator';
import { useViewer } from '@/lib/store/hooks';
import type { CreatorCampaign } from '@/types';

const TABS = ['invites', 'open', 'proposals'] as const;
type Tab = (typeof TABS)[number];
const PROPOSAL_FLOW = ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED'] as const;

export default function JobInboxPage() {
  const { world, me } = useViewer();
  const router = useRouter();
  const params = useSearchParams();
  const artist = me.artist!;
  const creator = artist.creator!;
  const initial = params.get('tab');
  const [tab, setTab] = useState<Tab>(TABS.includes(initial as Tab) ? (initial as Tab) : 'invites');
  const [pitching, setPitching] = useState<CreatorCampaign | null>(null);

  const myJobs = world.jobs.filter((j) => j.artistId === artist.id);
  const invites = myJobs.filter(isPendingInvite);
  const proposals = world.proposals.filter((p) => p.artistId === artist.id);
  const engaged = new Set([...proposals.map((p) => p.campaignId), ...myJobs.map((j) => j.campaignId)]);
  const open = world.campaigns.filter((c) => c.status === 'OPEN' && !engaged.has(c.id));
  // Campaigns that target your tier first.
  open.sort((a, b) => Number(b.tiers.includes(creator.tier)) - Number(a.tiers.includes(creator.tier)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Job inbox" subtitle="Direct invites from brands, and open campaigns you can pitch." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'invites', label: 'Invites', count: invites.length },
          { value: 'open', label: 'Open campaigns', count: open.length },
          { value: 'proposals', label: 'My proposals', count: proposals.length },
        ]}
      />

      {tab === 'invites' &&
        (invites.length === 0 ? (
          <EmptyState title="No invites right now" body="Brands invite creators from the directory based on tier and niche. Meanwhile, pitch an open campaign." action={<Button onClick={() => setTab('open')}>Browse open campaigns</Button>} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {invites.map((j) => {
              const c = byId(world.campaigns, j.campaignId)!;
              return (
                <Card key={j.id} tone="brand">
                  <CampaignBrief world={world} campaign={c} />
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="text-muted">Your fee (already in escrow)</span>
                    <Money amount={j.fee} className="font-semibold text-text" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      icon={<Check className="size-4" />}
                      onClick={() => {
                        respondToInvite(j.id, true);
                        toast('Invite accepted. Sign the agreement to start.');
                        router.push(`/creator/jobs/${j.id}`);
                      }}
                    >
                      Accept invite
                    </Button>
                    <Button
                      variant="ghost"
                      icon={<X className="size-4" />}
                      onClick={() => {
                        respondToInvite(j.id, false);
                        toast('Invite declined', 'info');
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === 'open' &&
        (open.length === 0 ? (
          <EmptyState title="No open campaigns" body="You’ve pitched everything that’s open. New campaigns appear here as brands publish them." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {open.map((c) => {
              const fits = c.tiers.includes(creator.tier);
              return (
                <CampaignCard
                  key={c.id}
                  world={world}
                  campaign={c}
                  action={
                    fits ? (
                      <Button size="sm" icon={<Send className="size-4" />} onClick={() => setPitching(c)}>Submit proposal</Button>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">Not open to your tier <TierBadge tier={creator.tier} /></span>
                    )
                  }
                />
              );
            })}
          </div>
        ))}

      {tab === 'proposals' &&
        (proposals.length === 0 ? (
          <EmptyState title="No proposals yet" body="Pitch an open campaign and track the brand’s response here." action={<Button onClick={() => setTab('open')}>Browse open campaigns</Button>} />
        ) : (
          <div className="flex flex-col gap-4">
            {proposals.map((p) => {
              const c = byId(world.campaigns, p.campaignId)!;
              const job = world.jobs.find((j) => j.campaignId === p.campaignId && j.artistId === artist.id && j.source === 'OPEN_PROPOSAL');
              const waiting = p.status === 'SUBMITTED' || p.status === 'SHORTLISTED';
              return (
                <Card key={p.id}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex-1">
                      <CampaignBrief world={world} campaign={c} compact />
                    </div>
                    <StatusPill status={p.status} tones={PROPOSAL_TONE} />
                  </div>
                  <div className="mt-4 border-t border-border pt-4 text-sm">
                    <div className="text-muted">Your pitch · {timeAgo(p.createdAt)}</div>
                    <div className="mt-1 text-text">“{p.pitch}”</div>
                    <div className="mt-1 font-semibold text-text">{formatKES(p.price)}</div>
                  </div>
                  <div className="mt-4">
                    <Timeline steps={PROPOSAL_FLOW} current={p.status === 'REJECTED' ? 'SHORTLISTED' : p.status} failed={p.status === 'REJECTED' ? 'REJECTED' : undefined} />
                  </div>
                  {waiting && <div className="mt-3 flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin text-brand" /> Waiting for {byId(world.businesses, c.brandId)?.name} to review…</div>}
                  {job && <LinkButton className="mt-4" href={`/creator/jobs/${job.id}`}>Open job</LinkButton>}
                </Card>
              );
            })}
          </div>
        ))}

      {pitching && (
        <ProposalModal
          campaign={pitching}
          onClose={() => setPitching(null)}
          onSubmit={(pitch, price) => {
            submitProposal(pitching.id, artist.id, pitch, price);
            setPitching(null);
            setTab('proposals');
            toast('Proposal sent');
          }}
        />
      )}
    </div>
  );
}

function ProposalModal({ campaign, onClose, onSubmit }: { campaign: CreatorCampaign; onClose: () => void; onSubmit: (pitch: string, price: ReturnType<typeof kes>) => void }) {
  const { world, me } = useViewer();
  const [pitch, setPitch] = useState('');
  const [price, setPrice] = useState(String(campaign.feePerCreator / 100));
  const amount = kes(Number(price) || 0);
  const high = amount > campaign.feePerCreator * 1.5;
  return (
    <Modal open onClose={onClose} title="Submit a proposal">
      <div className="flex flex-col gap-4">
        <CampaignBrief world={world} campaign={campaign} />
        <Field label="Your idea" hint="How you’d bring the brief to life for your audience.">
          <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="e.g. A Friday night reel ending at a rooftop with the product in hand…" />
        </Field>
        <Field label="Your price" hint={`The brand budgets ${formatKES(campaign.feePerCreator)} per creator.`} error={high ? 'That’s well above the brand’s budget; they’ll probably pass.' : null}>
          <Input prefix="KES" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <PayoutPreview className="-mt-2" amount={amount} payee={personRef(me.id)} feeBps={currentPolicy(world).creatorJobFeeBps} />
        <Button block size="lg" icon={<Send className="size-4" />} disabled={pitch.trim().length < 15 || !amount} onClick={() => onSubmit(pitch.trim(), amount)}>
          Send proposal
        </Button>
      </div>
    </Modal>
  );
}
