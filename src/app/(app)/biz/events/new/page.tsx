'use client';

import { useRouter } from 'next/navigation';
import { BackLink } from '@/components/shared/Cards';
import { EventForm } from '@/components/shared/EventForm';
import { Card, PageHeader } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { saveEvent } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';

export default function NewEventPage() {
  const { business } = useViewer();
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={<BackLink href="/biz/events" label="Events" />} title="New event" subtitle="Saved as a draft. Add ticket tiers and a lineup next, then publish." />
      <Card>
        <EventForm
          submitLabel="Save draft"
          onSubmit={(input) => {
            const id = saveEvent(business!.id, input);
            toast('Draft saved. Now add tickets.');
            router.replace(`/biz/events/${id}`);
          }}
        />
      </Card>
    </div>
  );
}
