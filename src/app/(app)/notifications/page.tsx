'use client';

import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Display';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { samePartyRef } from '@/lib/selectors';
import { markAllRead, markNotificationRead } from '@/lib/store/actions/account';
import { useViewer } from '@/lib/store/hooks';

export default function NotificationsPage() {
  const { world, actingAs } = useViewer();
  const router = useRouter();
  const items = world.notifications.filter((n) => samePartyRef(n.to, actingAs)).sort((a, b) => b.at.localeCompare(a.at));
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'You’re all caught up'} action={unread > 0 && <Button variant="outline" size="sm" icon={<CheckCheck className="size-4" />} onClick={() => markAllRead(actingAs)}>Mark all read</Button>} />
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title="No notifications yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                if (n.href) router.push(n.href);
              }}
              className={cn('flex items-start gap-3 rounded-card p-4 text-left shadow-card transition hover:shadow-raised', n.read ? 'bg-surface' : 'bg-brand-soft/60')}
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-text">{n.title}</span>
                <span className="block text-sm text-muted">{n.body}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(n.at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
