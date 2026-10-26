'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BadgeCheck, MonitorPlay, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, Money, PageHeader } from '@/components/ui/Display';
import { Checkbox, Select } from '@/components/ui/Field';
import { VENUE_TYPE_LABEL } from '@/lib/constants/labels';
import { formatCount, formatKES } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessId, InventoryId, Minor } from '@/types';

const REACH = ['0', '500', '1000', '1500'] as const;

export default function AdMarketplace() {
  const { world, business } = useViewer();
  const router = useRouter();
  const [area, setArea] = useState('ANY');
  const [minReach, setMinReach] = useState<(typeof REACH)[number]>('0');
  const [picked, setPicked] = useState<InventoryId[]>([]);

  const slots = world.inventory.flatMap((i) => (i.type === 'AD_SLOT' && i.status === 'AVAILABLE' && i.venueId !== business!.id ? [i] : []));
  const areaOf = (id: BusinessId) => byId(world.businesses, id)?.address.split(',').slice(-2, -1)[0]?.trim() ?? '';
  const areas = [...new Set(slots.map((s) => areaOf(s.venueId)).filter(Boolean))].sort();
  const shown = slots.filter((s) => (area === 'ANY' || areaOf(s.venueId) === area) && s.reachEstimate >= Number(minReach));
  const venues = [...new Set(shown.map((s) => s.venueId))];
  const chosen = slots.filter((s) => picked.includes(s.id));
  const perNight = chosen.reduce((a, s) => a + s.price, 0) as Minor;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title="Ad marketplace" subtitle="Book screen time at clubs and lounges. Prices are per night; reach is the venue’s estimate of people who see the screen." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={area} onChange={setArea} options={[{ value: 'ANY', label: 'All areas' }, ...areas.map((a) => ({ value: a, label: a }))]} />
        <Select value={minReach} onChange={setMinReach} options={REACH.map((r) => ({ value: r, label: r === '0' ? 'Any reach' : `${Number(r).toLocaleString('en-KE')}+ people/night` }))} />
      </div>
      {venues.length === 0 ? (
        <EmptyState icon={<MonitorPlay className="size-8" />} title="No screens available" body="Try another area. Booked screens come back once their campaign ends." />
      ) : (
        venues.map((vid) => {
          const v = byId(world.businesses, vid)!;
          return (
            <Card key={vid}>
              <CardHeader
                title={<span className="flex items-center gap-1.5">{v.name} {v.verified && <BadgeCheck className="size-4 text-brand" />}</span>}
                subtitle={`${v.venueType ? VENUE_TYPE_LABEL[v.venueType] : 'Venue'} · ${v.address}`}
              />
              <div className="flex flex-col gap-1">
                {shown
                  .filter((s) => s.venueId === vid)
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <Checkbox
                        checked={picked.includes(s.id)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))}
                        label={<span className="font-medium">{s.name}</span>}
                        description={`${s.screen} · ${s.slotLengthSec}s spots`}
                      />
                      <div className="ml-auto flex flex-col items-end">
                        <span className="text-sm font-semibold text-text"><Money amount={s.price} /> <span className="font-normal text-muted">/ night</span></span>
                        <span className="flex items-center gap-1 text-xs text-muted"><Users className="size-3.5" /> ~{formatCount(s.reachEstimate)} / night</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          );
        })
      )}
      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 md:bottom-6 md:left-64">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-card bg-text p-3 pl-5 text-bg shadow-float">
            <span className="text-sm">{chosen.length} slot{chosen.length > 1 ? 's' : ''} · {formatKES(perNight)} per night</span>
            <Button onClick={() => router.push(`/biz/ads/new?slots=${picked.join(',')}`)}>Build campaign</Button>
          </div>
        </div>
      )}
    </div>
  );
}
