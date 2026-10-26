'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, PageHeader } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { CREATOR_TIER } from '@/lib/constants/enums';
import { CREATOR_TIER_LABEL } from '@/lib/constants/labels';
import type { PolicyVersion } from '@/lib/constants/policy';
import { formatBps, formatCount, formatDate, formatKES } from '@/lib/format';
import { currentPolicy } from '@/lib/selectors';
import { addPolicyVersion } from '@/lib/store/actions/admin';
import { useWorld } from '@/lib/store/hooks';
import type { Minor } from '@/types';

type Unit = 'bps' | 'kes' | 'hours' | 'days' | 'count';
type Row = { label: string; unit: Unit; get: (p: PolicyVersion) => number; set: (p: PolicyVersion, v: number) => unknown };

type ScalarKey = { [K in keyof PolicyVersion]: PolicyVersion[K] extends number ? K : never }[keyof PolicyVersion];
const scalar = (label: string, unit: Unit, key: ScalarKey): Row => ({ label, unit, get: (p) => p[key], set: (p, v) => Object.assign(p, { [key]: v }) });

/** Every editable knob. Seller shares are derived (100% − platform fee) so they can't drift. */
const ROWS: Row[] = [
  {
    label: 'Platform fee',
    unit: 'bps',
    get: (p) => p.commissionBps.PLATFORM_FEE,
    set: (p, v) => Object.assign(p.commissionBps, { PLATFORM_FEE: v, VENUE_SHARE: 10000 - v, ARTIST_SHARE: 10000 - v }),
  },
  { label: 'Ad broker share', unit: 'bps', get: (p) => p.commissionBps.AD_BROKER_SHARE, set: (p, v) => Object.assign(p.commissionBps, { AD_BROKER_SHARE: v }) },
  scalar('Creator job fee', 'bps', 'creatorJobFeeBps'),
  scalar('Escrow hold after fulfilment', 'hours', 'escrowHoldHours'),
  scalar('Minimum payout', 'kes', 'minPayoutThreshold'),
  scalar('Payouts reviewed above', 'kes', 'payoutReviewAbove'),
  scalar('ID verification required above', 'kes', 'verificationRequiredAbove'),
  scalar('Ad spend needing verification', 'kes', 'adSpendVerifyThreshold'),
  scalar('Booking request expiry', 'hours', 'bookingRequestExpiryHours'),
  scalar('Referral reward', 'kes', 'referralReward'),
  scalar('Artist recruitment reward', 'kes', 'artistRecruitmentReward'),
  scalar('Become a Model reward', 'kes', 'modelProgrammeReward'),
  scalar('Lyric contribution reward', 'kes', 'lyricReward'),
  scalar('Creator tier recheck interval', 'days', 'tierRecheckDays'),
  ...CREATOR_TIER.map((t): Row => ({ label: `${CREATOR_TIER_LABEL[t]} tier from`, unit: 'count', get: (p) => p.tierThresholds[t], set: (p, v) => Object.assign(p.tierThresholds, { [t]: v }) })),
];

const show = (unit: Unit, v: number) =>
  unit === 'bps' ? formatBps(v) : unit === 'kes' ? formatKES(v as Minor) : unit === 'hours' ? `${v}h` : unit === 'days' ? `${v} days` : `${formatCount(v)} followers`;
/** Editor values are in human units: percent, shillings, hours… */
const toInput = (unit: Unit, v: number) => String(unit === 'bps' || unit === 'kes' ? v / 100 : v);
const fromInput = (unit: Unit, s: string) => Math.round(Number(s) * (unit === 'bps' || unit === 'kes' ? 100 : 1));

export default function AdminPolicyPage() {
  const w = useWorld();
  const [editing, setEditing] = useState(false);
  const live = currentPolicy(w);
  const versions = [...w.policy].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <div>
      <PageHeader
        title="Policy config"
        subtitle="Rates and thresholds are versioned by effective date. Every escrow records the version it opened under, so changes never rewrite old payments."
        action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(true)}>New version</Button>}
      />

      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Setting</th>
              {versions.map((v) => (
                <th key={v.version} className="px-4 py-3 align-top font-medium">
                  <div className="flex items-center gap-2 text-sm text-text">
                    {v.version}
                    {v.version === live.version ? <Badge tone="good">In force</Badge> : v.effectiveFrom > new Date().toISOString() ? <Badge tone="info">Scheduled</Badge> : <Badge>Superseded</Badge>}
                  </div>
                  <div className="mt-1 font-normal">From {formatDate(v.effectiveFrom)}</div>
                  <div className="font-normal">{v.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-2.5 text-muted">{r.label}</td>
                {versions.map((v, i) => {
                  const older = versions[i + 1];
                  const changed = older && r.get(older) !== r.get(v);
                  return (
                    <td key={v.version} className={changed ? 'px-4 py-2.5 font-semibold text-brand' : 'px-4 py-2.5 text-text'}>
                      {show(r.unit, r.get(v))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Highlighted values changed from the previous version.</p>

      {editing && <NewVersionModal base={live} existing={w.policy} onClose={() => setEditing(false)} />}
    </div>
  );
}

function bumpVersion(v: string) {
  const m = v.match(/^v(\d+)\.(\d+)$/);
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : `${v}-next`;
}

function NewVersionModal({ base, existing, onClose }: { base: PolicyVersion; existing: PolicyVersion[]; onClose: () => void }) {
  const latest = [...existing].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
  const [version, setVersion] = useState(bumpVersion(latest.version));
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [values, setValues] = useState(() => ROWS.map((r) => toInput(r.unit, r.get(base))));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!version.trim() || !note.trim()) return setError('Give the version a name and a note.');
    const effectiveFrom = new Date(`${from}T00:00:00`).toISOString();
    if (effectiveFrom <= base.effectiveFrom) return setError(`Must take effect after ${base.version} (${formatDate(base.effectiveFrom)}).`);
    const draft: PolicyVersion = structuredClone(base);
    draft.version = version.trim();
    draft.effectiveFrom = effectiveFrom;
    draft.note = note.trim();
    for (const [i, r] of ROWS.entries()) {
      const v = fromInput(r.unit, values[i]);
      if (!Number.isFinite(v) || v < 0) return setError(`${r.label} must be a positive number.`);
      if (r.unit === 'bps' && v > 10000) return setError(`${r.label} can’t exceed 100%.`);
      r.set(draft, v);
    }
    const err = addPolicyVersion(draft);
    if (err) return setError(err);
    toast(`${draft.version} saved${effectiveFrom > new Date().toISOString() ? `, takes effect ${formatDate(effectiveFrom)}` : ' and now in force'}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="New policy version" footer={<Button onClick={save}>Publish version</Button>}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Version">
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </Field>
          <Field label="Effective from">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
        </div>
        <Field label="Change note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Festive season promo rates" />
        </Field>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-text">Starting from {base.version}</h3>
          <p className="mb-3 text-sm text-muted">Percent, shillings, hours or days as labelled.</p>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {ROWS.map((r, i) => (
              <label key={r.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{r.label}</span>
                <Input
                  className="w-32"
                  prefix={r.unit === 'kes' ? 'KES' : r.unit === 'bps' ? '%' : undefined}
                  inputMode="decimal"
                  value={values[i]}
                  onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value.replace(/[^\d.]/g, '') : v)))}
                />
              </label>
            ))}
          </div>
        </div>
        {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
      </div>
    </Modal>
  );
}
