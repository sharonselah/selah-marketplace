'use client';

import { useState } from 'react';
import { ChevronRight, Gift, Megaphone, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { CopyField, ProcessingSteps, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { Timeline } from '@/components/ui/Visuals';
import { EARN_PROGRAMME_LABEL, LEAD_TONE, REWARD_TONE } from '@/lib/constants/labels';
import { LEAD_STATUS } from '@/lib/constants/enums';
import { formatDate, normalizeKenyanPhone } from '@/lib/format';
import { currentPolicy } from '@/lib/selectors';
import { submitEntry, submitLead } from '@/lib/store/actions/earn';
import { useViewer } from '@/lib/store/hooks';
import type { EarnEntry, Minor } from '@/types';

type Tab = 'overview' | 'referral' | 'recruit' | 'model' | 'lyrics';

export default function EarnPage() {
  const { world, me } = useViewer();
  const [tab, setTab] = useState<Tab>('overview');
  const policy = currentPolicy(world);
  const mine = world.earn.filter((e) => e.personId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (list: EarnEntry[]) => list.reduce((a, e) => a + e.reward, 0) as Minor;

  return (
    <div>
      <PageHeader title="Earn with Selah" subtitle="Rewards and commissions, paid straight to your wallet. Available to everyone." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6 w-fit max-w-full"
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'referral', label: 'Refer friends' },
          { value: 'recruit', label: 'Recruit artists' },
          { value: 'model', label: 'Become a model' },
          { value: 'lyrics', label: 'Lyrics' },
        ]}
      />

      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total earned" value={<Money amount={sum(mine.filter((e) => e.rewardStatus === 'PAID'))} />} icon={<Gift className="size-4" />} />
            <Stat label="Pending" value={<Money amount={sum(mine.filter((e) => e.rewardStatus === 'PENDING' || e.rewardStatus === 'APPROVED'))} />} />
            <Stat label="Submissions" value={mine.length} />
          </div>
          <Card>
            <CardHeader title="Ways to earn" />
            <div className="flex flex-col gap-1">
              {[
                { t: 'referral' as const, title: 'Refer a friend', body: `Earn ${(policy.referralReward / 100).toLocaleString()} KES when a friend you invite makes their first purchase.` },
                { t: 'recruit' as const, title: 'Recruit an artist', body: `Know a DJ or MC who should be on Selah? Earn ${(policy.artistRecruitmentReward / 100).toLocaleString()} KES once they’re activated.` },
                { t: 'model' as const, title: 'Become a model', body: 'Join our brand-activation roster and earn on every campaign you work.' },
                { t: 'lyrics' as const, title: 'Contribute lyrics', body: `Add accurate lyrics for Kenyan songs. ${(policy.lyricReward / 100).toLocaleString()} KES per accepted submission.` },
              ].map(({ t, title, body }) => (
                <button key={t} onClick={() => setTab(t)} className="group flex w-full items-center justify-between gap-4 py-3 text-left">
                  <span>
                    <span className="block text-sm font-medium text-text group-hover:text-brand">{title}</span>
                    <span className="block text-sm text-muted">{body}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Reward history" />
            {mine.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet. Start with a referral.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {mine.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-sm font-medium text-text">{EARN_PROGRAMME_LABEL[e.programme]}: {describe(e)}</div>
                      <div className="text-xs text-muted">{formatDate(e.createdAt)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Money amount={e.reward} className="text-sm font-semibold text-text" />
                      <StatusPill status={e.rewardStatus} tones={REWARD_TONE} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'referral' && <ReferralTab entries={mine.filter((e) => e.programme === 'REFERRAL')} reward={policy.referralReward} />}
      {tab === 'recruit' && <RecruitTab entries={mine.filter((e) => e.programme === 'ARTIST_RECRUITMENT')} />}
      {tab === 'model' && <ModelTab entries={mine.filter((e) => e.programme === 'BECOME_A_MODEL')} />}
      {tab === 'lyrics' && <LyricsTab entries={mine.filter((e) => e.programme === 'LYRIC_CONTRIBUTION')} />}
    </div>
  );
}

function describe(e: EarnEntry) {
  switch (e.programme) {
    case 'REFERRAL':
      return e.inviteeName;
    case 'ARTIST_RECRUITMENT':
      return e.leadName;
    case 'BECOME_A_MODEL':
      return 'Application';
    case 'LYRIC_CONTRIBUTION':
      return e.song;
  }
}

function ReferralTab({ entries, reward }: { entries: EarnEntry[]; reward: Minor }) {
  const { me } = useViewer();
  const link = `https://selah.co.ke/register?ref=${me.referralCode}`;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader title="Your referral link" subtitle={<>Friends sign up with your code; you earn <Money amount={reward} /> after their first purchase.</>} />
        <div className="flex flex-col gap-3">
          <CopyField value={link} />
          <div className="flex items-center gap-2 text-sm text-muted">
            Code: <Badge tone="brand">{me.referralCode}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {['WhatsApp', 'SMS', 'X', 'Instagram'].map((c) => (
              <Button key={c} size="sm" variant="outline" onClick={() => toast(`Opening ${c}… (prototype)`, 'info')}>
                Share on {c}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted">Tip: open the link in a private window and register a test account with code {me.referralCode} to see the reward land.</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Your invites" />
        {entries.length === 0 ? (
          <EmptyState icon={<UserPlus className="size-7" />} title="No invites yet" body="Share your link to get started." />
        ) : (
          <div className="flex flex-col gap-1">
            {entries.map((e) => e.programme === 'REFERRAL' && (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-text">{e.inviteeName}</div>
                  <div className="text-xs text-muted">{e.activated ? 'Made first purchase' : 'Signed up, awaiting first purchase'}</div>
                </div>
                <StatusPill status={e.rewardStatus} tones={REWARD_TONE} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RecruitTab({ entries }: { entries: EarnEntry[] }) {
  const { me } = useViewer();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader title="Submit an artist lead" subtitle="We’ll reach out, onboard them, and pay you once they’re activated." />
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !normalizeKenyanPhone(phone)) return setError('Add the artist’s name and a valid phone number.');
            submitLead(me.id, name.trim(), normalizeKenyanPhone(phone)!);
            setName('');
            setPhone('');
            setError(null);
            toast('Lead submitted. Watch it move through the pipeline.');
          }}
        >
          <Field label="Artist / stage name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DJ Mzee" />
          </Field>
          <Field label="Their phone number" error={error}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
          </Field>
          <Button type="submit" icon={<Megaphone className="size-4" />}>Submit lead</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Your leads" />
        {entries.length === 0 ? (
          <EmptyState title="No leads yet" />
        ) : (
          <div className="flex flex-col gap-5">
            {entries.map((e) => e.programme === 'ARTIST_RECRUITMENT' && (
              <div key={e.id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{e.leadName}</span>
                  <StatusPill status={e.leadStatus} tones={LEAD_TONE} />
                </div>
                <Timeline steps={LEAD_STATUS.filter((s) => s !== 'REJECTED')} current={e.leadStatus === 'REJECTED' ? 'SUBMITTED' : e.leadStatus} failed={e.leadStatus === 'REJECTED' ? 'REJECTED' : undefined} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ModelTab({ entries }: { entries: EarnEntry[] }) {
  const { me } = useViewer();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const applied = entries.length > 0;
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Become a model" subtitle="Brand activations, launches and promo nights. Paid per campaign." />
      {applied ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text">Application submitted</span>
          <StatusPill status={entries[0].rewardStatus} tones={REWARD_TONE} label={entries[0].rewardStatus === 'PAID' ? 'Approved & welcome bonus paid' : undefined} />
        </div>
      ) : sending ? (
        <ProcessingSteps title="Submitting application" done="Application received" steps={['Uploading your details', 'Sending to the talent team']} onDone={() => { submitEntry(me.id, { programme: 'BECOME_A_MODEL', note: note.trim() }); setSending(false); }} />
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Tell us about yourself" hint="Experience, height, languages, availability.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button className="self-start" disabled={note.trim().length < 10} onClick={() => setSending(true)}>Apply</Button>
        </div>
      )}
    </Card>
  );
}

function LyricsTab({ entries }: { entries: EarnEntry[] }) {
  const { me } = useViewer();
  const [song, setSong] = useState('');
  const [excerpt, setExcerpt] = useState('');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader title="Submit lyrics" />
        <div className="flex flex-col gap-4">
          <Field label="Song & artist">
            <Input value={song} onChange={(e) => setSong(e.target.value)} placeholder="e.g. Sauti Sol – Suzanna" />
          </Field>
          <Field label="Lyrics">
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="min-h-40" />
          </Field>
          <Button
            className="self-start"
            disabled={!song.trim() || excerpt.trim().length < 20}
            onClick={() => {
              submitEntry(me.id, { programme: 'LYRIC_CONTRIBUTION', song: song.trim(), excerpt: excerpt.trim() });
              setSong('');
              setExcerpt('');
              toast('Lyrics submitted for review');
            }}
          >
            Submit
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Your submissions" />
        {entries.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <div className="flex flex-col gap-1">
            {entries.map((e) => e.programme === 'LYRIC_CONTRIBUTION' && (
              <div key={e.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-text">{e.song}</span>
                <StatusPill status={e.rewardStatus} tones={REWARD_TONE} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
