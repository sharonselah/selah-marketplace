'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck, FileText, IdCard } from 'lucide-react';
import { Table } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, PageHeader } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Field';
import { Modal, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { badgeQueue, businessQueue, idQueue } from '@/lib/admin';
import { ARTIST_CATEGORY_LABEL, CAPABILITY_LABEL, VERIFICATION_LABEL } from '@/lib/constants/labels';
import { formatDate, timeAgo } from '@/lib/format';
import { BADGE_GIGS, BUSINESS_LABEL_TEXT, artistOwner, displayLabel, hasSellSide } from '@/lib/selectors';
import { approveBusiness, approveIdentity, grantVerifiedArtist, requestResubmission } from '@/lib/store/actions/admin';
import { useWorld } from '@/lib/store/hooks';
import type { PartyRef } from '@/types';

type Tab = 'ID' | 'BUSINESS' | 'BADGE' | 'RESULTS';

export default function AdminVerificationPage() {
  const w = useWorld();
  const [tab, setTab] = useState<Tab>('ID');
  const [rejecting, setRejecting] = useState<{ to: PartyRef; name: string } | null>(null);
  const ids = idQueue(w);
  const biz = businessQueue(w);
  const badges = badgeQueue(w);
  const results = w.people.filter((p) => !p.isAdmin && p.verification !== 'PHONE_VERIFIED').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const actions = (approve: () => void, to: PartyRef, name: string, approveLabel = 'Approve') => (
    <div key="a" className="flex justify-end gap-2">
      <Button size="sm" onClick={approve}>{approveLabel}</Button>
      <Button size="sm" variant="ghost" onClick={() => setRejecting({ to, name })}>Reject</Button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Verification" subtitle="Automated checks (IPRS/KYC, document scan) clear most accounts. Anything they can’t clear lands here for a person to review." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ID', label: 'ID manual review', count: ids.length },
          { value: 'BUSINESS', label: 'Business documents', count: biz.length },
          { value: 'BADGE', label: 'Verified Artist badge', count: badges.length },
          { value: 'RESULTS', label: 'Recent results' },
        ]}
      />

      {tab === 'ID' && (
        <Table
          head={['Seller', 'Why it’s here', 'Submitted', '']}
          empty="No ID checks waiting. Sellers who skip or fail the automated ID check appear here."
          rows={ids.map((p) => [
            <Link key="p" href={`/admin/people/${p.id}`} className="flex items-center gap-3 hover:text-brand">
              <Avatar name={p.name} size="sm" />
              <span className="flex flex-col"><span className="font-medium">{p.name}</span><span className="text-xs text-muted">{p.artist?.stageName} · {p.artist && ARTIST_CATEGORY_LABEL[p.artist.category]}</span></span>
            </Link>,
            <span key="r" className="flex items-center gap-2 text-muted"><IdCard className="size-4" /> Automated ID check not cleared</span>,
            <span key="t" className="text-muted">{timeAgo(p.createdAt)}</span>,
            actions(() => { approveIdentity(p.id); toast(`${p.name} is now ID verified`); }, { kind: 'PERSON', id: p.id }, p.name),
          ])}
        />
      )}

      {tab === 'BUSINESS' && (
        <Table
          head={['Business', 'Check level', 'Documents', 'Created', '']}
          empty="No business documents waiting."
          rows={biz.map((b) => {
            const strict = hasSellSide(b.capabilities);
            return [
              <Link key="b" href={`/admin/people/${b.id}`} className="flex flex-col hover:text-brand">
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted">{BUSINESS_LABEL_TEXT[displayLabel(b)]} · {b.capabilities.map((c) => CAPABILITY_LABEL[c]).join(', ') || 'no capabilities'}</span>
              </Link>,
              strict ? <Badge tone="warn">Strict (sells)</Badge> : <Badge>Light (buy only)</Badge>,
              <span key="d" className="flex flex-col gap-0.5 text-xs text-muted">
                <span className="flex items-center gap-1.5"><FileText className="size-3.5" /> KRA PIN {b.regTaxId}</span>
                {strict && <span className="flex items-center gap-1.5"><FileText className="size-3.5" /> Certificate of incorporation</span>}
                {strict && b.venueType && <span className="flex items-center gap-1.5"><FileText className="size-3.5" /> Liquor / county licence</span>}
              </span>,
              <span key="t" className="text-muted">{formatDate(b.createdAt)}</span>,
              actions(() => { approveBusiness(b.id); toast(`${b.name} verified`); }, { kind: 'BUSINESS', id: b.id }, b.name),
            ];
          })}
        />
      )}

      {tab === 'BADGE' && (
        <Table
          head={['Artist', 'Completed gigs', 'Rating', '']}
          empty={`No one eligible yet. Artists need ID verification and ${BADGE_GIGS}+ completed gigs.`}
          rows={badges.map((a) => {
            const owner = artistOwner(w, a);
            return [
              <Link key="a" href={`/admin/people/${owner.id}`} className="flex items-center gap-3 hover:text-brand">
                <Avatar name={a.stageName} size="sm" />
                <span className="font-medium">{a.stageName}</span>
              </Link>,
              a.gigsPlayed,
              `${a.rating.toFixed(1)}★`,
              actions(() => { grantVerifiedArtist(a.id); toast(`${a.stageName} now has the Verified Artist badge`); }, { kind: 'PERSON', id: owner.id }, a.stageName, 'Grant badge'),
            ];
          })}
        />
      )}

      {tab === 'RESULTS' && (
        <Table
          head={['Person', 'Result', 'Artist badge', 'Joined']}
          rows={results.map((p) => [
            <Link key="p" href={`/admin/people/${p.id}`} className="font-medium hover:text-brand">{p.name}</Link>,
            <Badge key="r" tone="good"><BadgeCheck className="size-3" /> {VERIFICATION_LABEL[p.verification]}</Badge>,
            p.artist ? VERIFICATION_LABEL[p.artist.verification] : <span className="text-muted">–</span>,
            <span key="j" className="text-muted">{formatDate(p.createdAt)}</span>,
          ])}
        />
      )}

      <RejectModal target={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}

function RejectModal({ target, onClose }: { target: { to: PartyRef; name: string } | null; onClose: () => void }) {
  const [reason, setReason] = useState('The document photo is blurry.');
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Reject ${target?.name ?? ''}`}
      footer={
        <Button
          variant="danger"
          disabled={!reason.trim()}
          onClick={() => {
            if (target) requestResubmission(target.to, reason.trim());
            toast('Resubmission requested', 'info');
            onClose();
          }}
        >
          Ask them to resubmit
        </Button>
      }
    >
      <Field label="Reason (sent to the account holder)">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <p className="mt-2 text-xs text-muted">The account keeps its current status and stays in this queue until it’s resubmitted and approved.</p>
    </Modal>
  );
}
