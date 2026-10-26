'use client';

import { useState } from 'react';
import { PartyLink, SearchBox, Table, matches } from '@/components/admin/AdminUI';
import { Badge, PageHeader } from '@/components/ui/Display';
import { Select } from '@/components/ui/Field';
import { NOTIFICATION_CHANNEL, NOTIFICATION_EVENT, type NotificationChannel, type NotificationEvent } from '@/lib/constants/enums';
import { humanize } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import { DEFAULT_PREFS } from '@/lib/store/actions/account';
import { useWorld } from '@/lib/store/hooks';
import type { AppNotification, World } from '@/types';

/** Every notification lands in-app; the person's prefs decide which other channels it fans out to. */
function channels(w: World, n: AppNotification): NotificationChannel[] {
  const out: NotificationChannel[] = [n.channel];
  const notify = n.to.kind === 'PERSON' ? { ...DEFAULT_PREFS, ...byId(w.people, n.to.id)?.prefs }.notify : { SMS: true, PUSH: false, EMAIL: true };
  for (const c of ['SMS', 'PUSH', 'EMAIL'] as const) if (notify[c] && !out.includes(c)) out.push(c);
  return out;
}

export default function AdminNotificationsPage() {
  const w = useWorld();
  const [q, setQ] = useState('');
  const [event, setEvent] = useState<NotificationEvent | 'ALL'>('ALL');
  const [channel, setChannel] = useState<NotificationChannel | 'ALL'>('ALL');
  const rows = w.notifications
    .map((n) => ({ n, via: channels(w, n) }))
    .filter(({ n, via }) => (event === 'ALL' || n.event === event) && (channel === 'ALL' || via.includes(channel)) && matches(q, n.title, n.body, partyName(w, n.to)));

  return (
    <div>
      <PageHeader title="Notifications log" subtitle="Everything the platform has sent, across channels. Delivery is simulated: nothing leaves this browser." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Recipient, title, body…" />
        <Select className="w-52" value={event} onChange={setEvent} options={[{ value: 'ALL' as const, label: 'All events' }, ...NOTIFICATION_EVENT.map((e) => ({ value: e, label: humanize(e) }))]} />
        <Select className="w-40" value={channel} onChange={setChannel} options={[{ value: 'ALL' as const, label: 'All channels' }, ...NOTIFICATION_CHANNEL.map((c) => ({ value: c, label: humanize(c) }))]} />
        <span className="text-sm text-muted">{rows.length} of {w.notifications.length}</span>
      </div>
      <Table
        head={['When', 'To', 'Event', 'Message', 'Delivered via', 'Read']}
        empty="No notifications match."
        rows={rows.slice(0, 200).map(({ n, via }) => [
          <span key="w" className="whitespace-nowrap text-muted">{formatDateTime(n.at)}</span>,
          <PartyLink key="t" world={w} party={n.to} />,
          <Badge key="e">{humanize(n.event)}</Badge>,
          <span key="m" className="flex flex-col"><span className="font-medium">{n.title}</span><span className="text-xs text-muted">{n.body}</span></span>,
          <span key="v" className="text-xs text-muted">{via.map((c) => (c === 'IN_APP' ? 'In-app' : c === 'SMS' ? 'SMS' : humanize(c))).join(' · ')}</span>,
          n.read ? <span key="r" className="text-muted">Yes</span> : <Badge key="r" tone="info">Unread</Badge>,
        ])}
      />
      {rows.length > 200 && <p className="mt-2 text-xs text-muted">Showing the latest 200. Narrow the filters to see older ones.</p>}
    </div>
  );
}
