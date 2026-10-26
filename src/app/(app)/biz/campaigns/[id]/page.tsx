'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Eye, FileText, Pencil, Rocket, Send, Star, Wallet } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { CampaignBrief, TierBadge } from '@/components/shared/Creator';
import { ExportButton } from '@/components/shared/ExportButton';
import { FundJobModal } from '@/components/shared/FundJobModal';
import { Button, LinkButton } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, EmptyState, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { ProgressBar } from '@/components/ui/Visuals';
import { CAMPAIGN_TONE, CREATOR_TIER_LABEL, ESCROW_LABEL, JOB_STATUS_LABEL, JOB_TONE, PROPOSAL_TONE } from '@/lib/constants/labels';
import { csvDate, csvMoney, today } from '@/lib/csv';
import { formatCount, timeAgo } from '@/lib/format';
import { byId, findArtist, walletOf } from '@/lib/selectors';
import { acceptProposal, rejectProposal, setCampaignStatus, shortlistProposal } from '@/lib/store/actions/brand';
import { useViewer } from '@/lib/store/hooks';
import type { CampaignId, CreatorProposal, Minor } from '@/types';

export default function CampaignDetail() {
  const { id } = useParams<{ id: CampaignId }>();
  const { world, me, actingAs, business } = useViewer();
  const [accepting, setAccepting] = useState<CreatorProposal | null>(null);
  const c = byId(world.campaigns, id);
  if (!c || c.brandId !== business!.id) return <EmptyState title="Campaign not found" action={<BackLink href="/biz/campaigns" label="Creator campaigns" />} />;

  const proposals = world.proposals.filter((p) => p.campaignId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const jobs = world.jobs.filter((j) => j.campaignId === c.id);
  const live = jobs.filter((j) => j.status !== 'CANCELLED');
  const reach = live.reduce((a, j) => a + (findArtist(world, j.artistId)?.creator?.followerCount ?? 0), 0);
  const spend = live.reduce((a, j) => a + j.fee, 0) as Minor;
  const done = live.filter((j) => j.status === 'PAID').length;
  const full = live.length >= c.slots;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        back={<BackLink href="/biz/campaigns" label="Creator campaigns" />}
        title={c.title}
        subtitle={<span className="flex flex-wrap gap-1">{c.tiers.map((t) => <TierBadge key={t} tier={t} />)}</span>}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={c.status} tones={CAMPAIGN_TONE} />
            <ExportButton
              size="sm"
              label="Report"
              filename={`campaign-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${today()}`}
              build={() => ({
                head: ['Creator', 'Tier', 'Followers', 'Source', 'Status', 'Fee (KES)', 'Escrow', 'Last draft', 'Posted URL'],
                rows: jobs.map((j) => {
                  const a = findArtist(world, j.artistId);
                  const e = byId(world.escrows, j.escrowId);
                  return [a?.stageName, a?.creator && CREATOR_TIER_LABEL[a.creator.tier], a?.creator?.followerCount, j.source === 'DIRECT_INVITE' ? 'Invite' : 'Proposal', JOB_STATUS_LABEL[j.status], csvMoney(j.fee), e && ESCROW_LABEL[e.state], csvDate(j.drafts.at(-1)?.submittedAt), j.jobType === 'INFLUENCE' ? j.postedUrl : undefined];
                }),
              })}
            />
            {c.status === 'DRAFT' && <LinkButton size="sm" variant="outline" icon={<Pencil className="size-4" />} href={`/biz/campaigns/new?edit=${c.id}`}>Edit</LinkButton>}
            {c.status === 'DRAFT' && (
              <Button size="sm" icon={<Rocket className="size-4" />} onClick={() => { setCampaignStatus(c.id, 'OPEN'); toast('Campaign is open. Creators can now pitch.'); }}>Publish</Button>
            )}
            {c.status === 'CLOSED' && <Button size="sm" variant="outline" onClick={() => setCampaignStatus(c.id, 'OPEN')}>Reopen</Button>}
            {(c.status === 'OPEN' || c.status === 'FILLED') && <Button size="sm" variant="ghost" onClick={() => { setCampaignStatus(c.id, 'CLOSED'); toast('Campaign closed to new proposals', 'info'); }}>Close</Button>}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reach" value={formatCount(reach)} hint="Combined followers of hired creators" icon={<Eye className="size-4" />} />
        <Stat label="Submissions" value={proposals.length} hint={`${proposals.filter((p) => p.status === 'SUBMITTED' || p.status === 'SHORTLISTED').length} awaiting review`} icon={<FileText className="size-4" />} />
        <Stat label="Committed spend" value={<Money amount={spend} />} hint={<>of <Money amount={c.budget} /> budget</>} icon={<Wallet className="size-4" />} />
        <Stat label="Completion" value={`${done}/${live.length || 0}`} hint={<ProgressBar value={done} max={live.length} className="mt-1" />} icon={<CheckCircle2 className="size-4" />} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Proposals" subtitle={c.status === 'DRAFT' ? 'Publish the campaign to receive proposals.' : 'Shortlist the ones you like, then accept to hire.'} />
            {proposals.length === 0 ? (
              <p className="text-sm text-muted">{c.status === 'OPEN' ? 'Waiting for creators to pitch. Proposals usually arrive within minutes.' : 'No proposals.'}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {proposals.map((p) => {
                  const a = findArtist(world, p.artistId);
                  const open = p.status === 'SUBMITTED' || p.status === 'SHORTLISTED';
                  return (
                    <div key={p.id} className="flex flex-col gap-2 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a?.stageName ?? 'Creator'} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-text">{a?.stageName} {a?.creator && <TierBadge tier={a.creator.tier} />}</div>
                          <div className="text-xs text-muted">{a?.creator ? `${formatCount(a.creator.followerCount)} followers · ` : ''}{timeAgo(p.createdAt)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Money amount={p.price} className={p.price > c.feePerCreator ? 'text-sm font-semibold text-warn' : 'text-sm font-semibold text-text'} />
                          <StatusPill status={p.status} tones={PROPOSAL_TONE} />
                        </div>
                      </div>
                      <p className="text-sm text-muted">“{p.pitch}”</p>
                      {open && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={full} onClick={() => setAccepting(p)}>{full ? 'All slots filled' : 'Accept & hire'}</Button>
                          {p.status === 'SUBMITTED' && <Button size="sm" variant="outline" icon={<Star className="size-4" />} onClick={() => shortlistProposal(p.id)}>Shortlist</Button>}
                          <Button size="sm" variant="ghost" onClick={() => rejectProposal(p.id)}>Reject</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Jobs" subtitle={`${live.length} of ${c.slots} creators hired`} action={c.status !== 'DRAFT' && !full && <LinkButton size="sm" variant="secondary" icon={<Send className="size-4" />} href={`/biz/creators?campaign=${c.id}`}>Invite creators</LinkButton>} />
            {jobs.length === 0 ? (
              <p className="text-sm text-muted">Accept a proposal or invite a creator to start a job.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {jobs.map((j) => {
                  const a = findArtist(world, j.artistId);
                  return (
                    <Link key={j.id} href={`/biz/jobs/${j.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                      <Avatar name={a?.stageName ?? 'Creator'} size="sm" />
                      <div className="min-w-0 flex-1 text-sm font-medium text-text">{a?.stageName}</div>
                      <Money amount={j.fee} className="text-sm text-text" />
                      <StatusPill status={j.status} tones={JOB_TONE} label={JOB_STATUS_LABEL[j.status]} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        <Card className="h-fit">
          <CampaignBrief world={world} campaign={c} />
        </Card>
      </div>

      {accepting && (
        <FundJobModal
          title={`Hire ${findArtist(world, accepting.artistId)?.stageName}`}
          amount={accepting.price}
          balance={walletOf(world, actingAs)}
          phone={me.phone}
          intro="Their fee is held in escrow and released once you confirm the work. They’ll sign the agreement and start right away."
          onClose={() => setAccepting(null)}
          onPaid={(m) => {
            acceptProposal(accepting.id, m);
            setAccepting(null);
            toast('Creator hired. Their draft will land in Job approval.');
          }}
        />
      )}
    </div>
  );
}
