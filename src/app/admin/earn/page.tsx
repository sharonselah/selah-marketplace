'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Table } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Select } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { EARN_PROGRAMME, LEAD_STATUS, type EarnProgramme } from '@/lib/constants/enums';
import { EARN_PROGRAMME_LABEL, LEAD_TONE, REWARD_TONE, humanize } from '@/lib/constants/labels';
import { timeAgo } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { setLeadStatus } from '@/lib/store/actions/admin';
import { approveEarn, rejectEarn } from '@/lib/store/actions/earn';
import { useWorld } from '@/lib/store/hooks';
import type { EarnEntry } from '@/types';

const DETAIL_HEAD: Record<EarnProgramme, string> = {
  REFERRAL: 'Invitee',
  ARTIST_RECRUITMENT: 'Lead',
  BECOME_A_MODEL: 'Application',
  LYRIC_CONTRIBUTION: 'Submission',
};

function detail(e: EarnEntry) {
  switch (e.programme) {
    case 'REFERRAL':
      return <span>{e.inviteeName} <span className="text-xs text-muted">{e.activated ? '· activated' : '· not yet active'}</span></span>;
    case 'ARTIST_RECRUITMENT':
      return <span className="flex flex-col"><span className="font-medium">{e.leadName}</span><span className="text-xs text-muted">{e.leadPhone}</span></span>;
    case 'BECOME_A_MODEL':
      return <span className="text-sm">{e.note}</span>;
    case 'LYRIC_CONTRIBUTION':
      return <span className="flex flex-col"><span className="font-medium">{e.song}</span><span className="text-xs italic text-muted">“{e.excerpt}”</span></span>;
  }
}

export default function AdminEarnPage() {
  const w = useWorld();
  const [tab, setTab] = useState<EarnProgramme>('ARTIST_RECRUITMENT');
  const list = w.earn.filter((e) => e.programme === tab);
  const pending = (p: EarnProgramme) => w.earn.filter((e) => e.programme === p && (e.rewardStatus === 'PENDING' || e.rewardStatus === 'APPROVED')).length;

  return (
    <div>
      <PageHeader title="Earn moderation" subtitle="Approving pays the reward into the member’s wallet straight away. Rewards are set by the policy version at submission." />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={EARN_PROGRAMME.map((p) => ({ value: p, label: EARN_PROGRAMME_LABEL[p], count: pending(p) || undefined }))} />
      <Table
        head={['Member', DETAIL_HEAD[tab], ...(tab === 'ARTIST_RECRUITMENT' ? ['Pipeline'] : []), 'Reward', 'Status', '']}
        empty="No submissions in this programme yet."
        rows={list.map((e) => {
          const person = byId(w.people, e.personId);
          const open = e.rewardStatus === 'PENDING' || e.rewardStatus === 'APPROVED';
          return [
            <Link key="p" href={`/admin/people/${e.personId}`} className="flex flex-col hover:text-brand">
              <span className="font-medium">{person?.name ?? 'Unknown'}</span>
              <span className="text-xs text-muted">{timeAgo(e.createdAt)}</span>
            </Link>,
            detail(e),
            ...(e.programme === 'ARTIST_RECRUITMENT'
              ? [
                  <div key="l" className="flex items-center gap-2">
                    {open ? (
                      <Select
                        className="h-9 w-36 text-xs"
                        value={e.leadStatus}
                        onChange={(s) => { setLeadStatus(e.id, s); toast(`Lead moved to ${humanize(s).toLowerCase()}`, 'info'); }}
                        options={LEAD_STATUS.map((s) => ({ value: s, label: humanize(s) }))}
                      />
                    ) : (
                      <StatusPill status={e.leadStatus} tones={LEAD_TONE} />
                    )}
                  </div>,
                ]
              : []),
            <Money key="m" amount={e.reward} className="font-medium" />,
            <StatusPill key="s" status={e.rewardStatus} tones={REWARD_TONE} />,
            open ? (
              <div key="a" className="flex justify-end gap-2">
                <Button size="sm" onClick={() => { approveEarn(e.id); toast('Reward paid'); }}>Approve &amp; pay</Button>
                <Button size="sm" variant="ghost" onClick={() => { rejectEarn(e.id); toast('Submission rejected', 'info'); }}>Reject</Button>
              </div>
            ) : (
              <span key="a" />
            ),
          ];
        })}
      />
    </div>
  );
}
