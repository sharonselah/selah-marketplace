'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ClipboardList, Megaphone, Plus, Trash2 } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, DefinitionList, PageHeader } from '@/components/ui/Display';
import { Field, Input, OptionCard, Textarea } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { CREATOR_TIER, type CreatorTier, type JobType } from '@/lib/constants/enums';
import { CREATOR_TIER_LABEL, JOB_TYPE_LABEL } from '@/lib/constants/labels';
import { bps, formatBps, formatKES, kes } from '@/lib/format';
import { byId, currentPolicy } from '@/lib/selectors';
import { saveCampaign } from '@/lib/store/actions/brand';
import { useViewer } from '@/lib/store/hooks';
import type { CampaignId, Minor } from '@/types';

const DEFAULT_DELIVERABLES: Record<JobType, string[]> = {
  INFLUENCE: ['1 Instagram reel (15–30s)', '3 stories with link sticker'],
  INSIGHTS: ['Complete the product survey', 'One photo of the product in use'],
};

export default function CampaignBuilder() {
  const { world, business } = useViewer();
  const router = useRouter();
  const editId = useSearchParams().get('edit') as CampaignId | null;
  const existing = byId(world.campaigns, editId ?? undefined);
  const policy = currentPolicy(world);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [brief, setBrief] = useState(existing?.brief ?? '');
  const [jobType, setJobType] = useState<JobType>(existing?.jobType ?? 'INFLUENCE');
  const [tiers, setTiers] = useState<CreatorTier[]>(existing?.tiers ?? ['NANO', 'MICRO']);
  const [fee, setFee] = useState(existing ? String(existing.feePerCreator / 100) : '5000');
  const [slots, setSlots] = useState(existing ? String(existing.slots) : '5');
  const [deadline, setDeadline] = useState(existing ? existing.deadline.slice(0, 10) : '');
  const [deliverables, setDeliverables] = useState<string[]>(existing?.deliverables ?? DEFAULT_DELIVERABLES.INFLUENCE);
  const [error, setError] = useState<string | null>(null);

  const feeMinor = kes(Number(fee));
  const budget = (feeMinor * Number(slots || 0)) as Minor;
  const today = new Date().toISOString().slice(0, 10);

  const submit = (publish: boolean) => {
    if (title.trim().length < 3) return setError('Give the campaign a title.');
    if (brief.trim().length < 20) return setError('Write a brief of at least 20 characters so creators know what you want.');
    if (!tiers.length) return setError('Pick at least one creator tier.');
    if (!Number(fee) || !Number(slots)) return setError('Set the fee per creator and how many creators you need.');
    if (!deadline) return setError('Set a deadline.');
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    if (!items.length) return setError('Add at least one deliverable.');
    setError(null);
    const id = saveCampaign(business!.id, { title: title.trim(), brief: brief.trim(), jobType, tiers, feePerCreator: feeMinor, slots: Number(slots), deadline: new Date(`${deadline}T18:00`).toISOString(), deliverables: items }, publish, existing?.id);
    toast(publish ? 'Campaign is open. Creators can now pitch.' : 'Draft saved');
    router.replace(`/biz/campaigns/${id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={<BackLink href={existing ? `/biz/campaigns/${existing.id}` : '/biz/campaigns'} label="Creator campaigns" />} title={existing ? 'Edit campaign' : 'New creator campaign'} subtitle="Creators matching your tiers see it once it’s open. You can also invite creators directly." />
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <Card>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {(['INFLUENCE', 'INSIGHTS'] as const).map((t) => (
                <OptionCard
                  key={t}
                  selected={jobType === t}
                  onClick={() => {
                    setJobType(t);
                    if (!existing) setDeliverables(DEFAULT_DELIVERABLES[t]);
                  }}
                  icon={t === 'INFLUENCE' ? <Megaphone className="size-5" /> : <ClipboardList className="size-5" />}
                  title={JOB_TYPE_LABEL[t]}
                  description={t === 'INFLUENCE' ? 'Draft → your approval → posted → you confirm → paid.' : 'Survey or feedback → your approval → paid. No posting.'}
                />
              ))}
            </div>
            <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday night out with Kilele" /></Field>
            <Field label="Brief" hint="Tone, do’s and don’ts, key message.">
              <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Creator tiers</span>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TIER.map((t) => {
                  const on = tiers.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => setTiers(on ? tiers.filter((x) => x !== t) : [...tiers, t])} className={cn('rounded-full px-3 py-1.5 text-sm transition', on ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text hover:bg-brand-soft')}>
                      {CREATOR_TIER_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fee per creator (KES)"><Input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Creators needed"><Input inputMode="numeric" value={slots} onChange={(e) => setSlots(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Deadline"><Input type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text">Deliverables</span>
              {deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={d} onChange={(e) => setDeliverables(deliverables.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Deliverable ${i + 1}`} />
                  <button type="button" className="text-muted hover:text-bad" aria-label="Remove deliverable" onClick={() => setDeliverables(deliverables.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => setDeliverables([...deliverables, ''])}>Add deliverable</Button>
            </div>
            {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button onClick={() => submit(true)}>{existing?.status === 'OPEN' ? 'Save changes' : 'Publish campaign'}</Button>
              {existing?.status !== 'OPEN' && <Button variant="outline" onClick={() => submit(false)}>Save draft</Button>}
            </div>
          </div>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Budget" />
          <DefinitionList
            items={[
              ['Per creator', formatKES(feeMinor)],
              ['Creators', slots || '0'],
              ['Total budget', formatKES(budget)],
              [`Creators keep`, formatKES((budget - bps(budget, policy.creatorJobFeeBps)) as Minor)],
            ]}
          />
          <p className="mt-3 text-xs text-muted">Each creator’s fee is held in escrow when they start and released once you confirm their work. Selah’s {formatBps(policy.creatorJobFeeBps)} creator job fee comes out of the fee (policy {policy.version}).</p>
        </Card>
      </div>
    </div>
  );
}
