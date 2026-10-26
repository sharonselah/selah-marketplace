'use client';

import { PartyLink } from '@/components/admin/AdminUI';
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/Display';
import {
  AD_SLOT_STATUS,
  BOOKING_REQUEST_STATUS,
  BOOKING_STATUS,
  CAMPAIGN_STATUS,
  CONTRACT_STATUS,
  DISPUTE_STATUS,
  ESCROW_STATE,
  EVENT_STATUS,
  JOB_STATUS,
  LEAD_STATUS,
  ORDER_STATUS,
  REWARD_STATUS,
  TRANSACTION_STATUS,
  VERIFICATION_TIER,
} from '@/lib/constants/enums';
import {
  AD_SLOT_TONE,
  BOOKING_REQUEST_TONE,
  BOOKING_TONE,
  CAMPAIGN_TONE,
  CONTRACT_TONE,
  DISPUTE_TONE,
  ESCROW_TONE,
  EVENT_TONE,
  JOB_TONE,
  LEAD_TONE,
  ORDER_TONE,
  PROPOSAL_TONE,
  REWARD_TONE,
  TRANSACTION_TONE,
  humanize,
  type Tone,
} from '@/lib/constants/labels';
import { artists, businessRef, personRef } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';
import type { ArtistId, PartyRef, World } from '@/types';

type Sample = { status: string; id: string; label: string; party: PartyRef };
type Machine = { name: string; statuses: readonly string[]; tones?: Record<string, Tone>; samples: Sample[] };

/** QA view: one record per status for every state machine, so gaps in the seed are obvious. */
function machines(w: World): Machine[] {
  const owner = (artistId: ArtistId): PartyRef => personRef(artists(w).find((a) => a.id === artistId)?.personId ?? 'per_admin');
  return [
    { name: 'Booking request', statuses: BOOKING_REQUEST_STATUS, tones: BOOKING_REQUEST_TONE, samples: w.bookingRequests.map((r) => ({ status: r.status, id: r.id, label: r.eventName, party: r.buyer })) },
    { name: 'Booking', statuses: BOOKING_STATUS, tones: BOOKING_TONE, samples: w.bookings.map((b) => ({ status: b.status, id: b.id, label: b.eventName, party: b.buyer })) },
    { name: 'Contract', statuses: CONTRACT_STATUS, tones: CONTRACT_TONE, samples: w.contracts.map((c) => ({ status: c.status, id: c.id, label: c.title, party: c.signedBy[0] ?? personRef('per_admin') })) },
    { name: 'Artist pitch', statuses: ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'], tones: PROPOSAL_TONE, samples: w.pitches.map((p) => ({ status: p.status, id: p.id, label: p.message.slice(0, 40), party: owner(p.artistId) })) },
    { name: 'Order', statuses: ORDER_STATUS, tones: ORDER_TONE, samples: w.orders.map((o) => ({ status: o.status, id: o.id, label: o.lines[0]?.name ?? 'Order', party: o.buyer })) },
    { name: 'Escrow', statuses: ESCROW_STATE, tones: ESCROW_TONE, samples: w.escrows.map((e) => ({ status: e.state, id: e.id, label: humanize(e.subject.kind), party: e.payer })) },
    { name: 'Transaction', statuses: TRANSACTION_STATUS, tones: TRANSACTION_TONE, samples: w.transactions.map((t) => ({ status: t.status, id: t.id, label: t.description, party: t.party })) },
    { name: 'Dispute', statuses: DISPUTE_STATUS, tones: DISPUTE_TONE, samples: w.disputes.map((d) => ({ status: d.status, id: d.id, label: d.reason, party: d.raisedBy })) },
    { name: 'Event', statuses: EVENT_STATUS, tones: EVENT_TONE, samples: w.events.map((e) => ({ status: e.status, id: e.id, label: e.title, party: businessRef(e.venueId) })) },
    { name: 'Ad slot', statuses: AD_SLOT_STATUS, tones: AD_SLOT_TONE, samples: w.inventory.flatMap((i) => (i.type === 'AD_SLOT' ? [{ status: i.status, id: i.id, label: i.name, party: businessRef(i.venueId) }] : [])) },
    { name: 'Creator campaign', statuses: CAMPAIGN_STATUS, tones: CAMPAIGN_TONE, samples: w.campaigns.map((c) => ({ status: c.status, id: c.id, label: c.title, party: businessRef(c.brandId) })) },
    { name: 'Creator proposal', statuses: ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'], tones: PROPOSAL_TONE, samples: w.proposals.map((p) => ({ status: p.status, id: p.id, label: p.pitch.slice(0, 40), party: owner(p.artistId) })) },
    { name: 'Job', statuses: JOB_STATUS, tones: JOB_TONE, samples: w.jobs.map((j) => ({ status: j.status, id: j.id, label: `${humanize(j.jobType)} job`, party: owner(j.artistId) })) },
    { name: 'Ad campaign', statuses: ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED'], samples: w.adCampaigns.map((c) => ({ status: c.status, id: c.id, label: c.name, party: businessRef(c.brandId) })) },
    { name: 'Earn reward', statuses: REWARD_STATUS, tones: REWARD_TONE, samples: w.earn.map((e) => ({ status: e.rewardStatus, id: e.id, label: humanize(e.programme), party: personRef(e.personId) })) },
    { name: 'Recruitment lead', statuses: LEAD_STATUS, tones: LEAD_TONE, samples: w.earn.flatMap((e) => (e.programme === 'ARTIST_RECRUITMENT' ? [{ status: e.leadStatus, id: e.id, label: e.leadName, party: personRef(e.personId) }] : [])) },
    { name: 'Verification', statuses: VERIFICATION_TIER, samples: w.people.filter((p) => !p.isAdmin).map((p) => ({ status: p.artist?.verification === 'VERIFIED_ARTIST' ? 'VERIFIED_ARTIST' : p.verification, id: p.id, label: p.name, party: personRef(p.id) })) },
  ];
}

export default function AdminStatesPage() {
  const w = useWorld();
  const all = machines(w);
  const covered = all.reduce((a, m) => a + m.statuses.filter((s) => m.samples.some((x) => x.status === s)).length, 0);
  const total = all.reduce((a, m) => a + m.statuses.length, 0);

  return (
    <div>
      <PageHeader title="State galleries" subtitle={`One live record per status for every state machine. ${covered} of ${total} states have an example in the current world.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        {all.map((m) => {
          const have = m.statuses.filter((s) => m.samples.some((x) => x.status === s)).length;
          return (
            <Card key={m.name}>
              <CardHeader title={m.name} action={<Badge tone={have === m.statuses.length ? 'good' : 'warn'}>{have}/{m.statuses.length}</Badge>} />
              <div className="flex flex-col gap-1">
                {m.statuses.map((s) => {
                  const hits = m.samples.filter((x) => x.status === s);
                  const ex = hits[0];
                  return (
                    <div key={s} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-40 shrink-0"><Badge tone={m.tones?.[s] ?? 'neutral'}>{humanize(s)}</Badge></span>
                      {ex ? (
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-text">{ex.label}</span>
                          <span className="shrink-0 text-xs text-muted">· <PartyLink world={w} party={ex.party} className="font-normal text-muted" /></span>
                        </span>
                      ) : (
                        <span className="flex-1 text-xs text-muted">No record in this state</span>
                      )}
                      <span className="shrink-0 text-xs text-muted">{hits.length}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
