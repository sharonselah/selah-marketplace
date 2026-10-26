'use client';

import { useEffect, useState } from 'react';
import { Music, Radio, Megaphone, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, IconCircle, Money, PageHeader } from '@/components/ui/Display';
import { QrCode } from '@/components/ui/Visuals';
import { cn } from '@/lib/cn';
import { FIRST_NAMES } from '@/lib/data/pools';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';

type Req = { id: number; who: string; kind: 'SONG' | 'SHOUT' | 'TIP'; text: string; amount: Minor; done: boolean };
const SONGS = ['Wamlambez – Sailors', 'Mama Yao – Bensoul', 'Unavailable – Davido', 'Water – Tyla', 'Sura Yako – Sauti Sol', 'Calm Down – Rema'];

/** Live session preview. Real-time requests are scoped separately in the spec; this simulates the experience locally. */
export default function LivePage() {
  const { me } = useViewer();
  const artist = me.artist!;
  const [live, setLive] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);

  useEffect(() => {
    if (!live) return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      const kind = (['SONG', 'SHOUT', 'TIP'] as const)[n % 3];
      const who = FIRST_NAMES[(n * 7) % FIRST_NAMES.length];
      const amount = (kind === 'SONG' ? artist.pricing.songRequest : kind === 'SHOUT' ? artist.pricing.shoutOut : ((100 + (n % 5) * 100) * 100)) as Minor;
      const text = kind === 'SONG' ? SONGS[n % SONGS.length] : kind === 'SHOUT' ? `Shout-out to the ${['birthday girl', 'Westlands crew', 'class of 2019', 'groom-to-be'][n % 4]}!` : 'Tip';
      setReqs((r) => [{ id: n, who, kind, text, amount, done: false }, ...r].slice(0, 30));
    }, 3500);
    return () => clearInterval(t);
  }, [live, artist.pricing.songRequest, artist.pricing.shoutOut]);

  const total = reqs.reduce((a, r) => a + r.amount, 0) as Minor;
  const Icon = { SONG: Music, SHOUT: Megaphone, TIP: HandCoins };

  return (
    <div>
      <PageHeader title="Live requests & tips" subtitle="Turn on session mode at a gig. Patrons scan your QR to request songs, shout-outs and send tips." action={<Badge tone="warn">Preview: scoped as a separate real-time feature</Badge>} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center text-center">
          <QrCode value={`selah-live-${artist.id}`} size={200} />
          <div className="mt-3 text-sm font-medium text-text">selah.co.ke/live/{artist.stageName.toLowerCase().replace(/\s+/g, '')}</div>
          <p className="mt-1 text-xs text-muted">Display this on the venue screen or your booth.</p>
          <Button className="mt-4" block variant={live ? 'danger' : 'primary'} icon={<Radio className="size-4" />} onClick={() => setLive(!live)}>
            {live ? 'End session' : 'Start session'}
          </Button>
          <div className="mt-5 w-full border-t border-border pt-4">
            <div className="text-xs text-muted">Session earnings</div>
            <Money amount={total} className="text-title text-text" />
          </div>
        </Card>
        <Card>
          <CardHeader title={live ? 'Incoming requests' : 'Session is off'} action={live && <span className="flex items-center gap-1.5 text-xs font-medium text-bad"><span className="size-2 animate-pulse rounded-full bg-bad" /> LIVE</span>} />
          {reqs.length === 0 ? (
            <p className="text-sm text-muted">{live ? 'Waiting for the first request…' : 'Start a session to receive requests.'}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {reqs.map((r) => {
                const I = Icon[r.kind];
                return (
                  <div key={r.id} className={cn('flex items-center gap-3 py-3 transition', r.done && 'opacity-50')}>
                    <IconCircle icon={<I className="size-4" />} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">{r.text}</div>
                      <div className="text-xs text-muted">{r.who}</div>
                    </div>
                    <Money amount={r.amount} className="text-sm font-semibold text-text" />
                    {r.kind !== 'TIP' && !r.done && (
                      <Button size="sm" variant="secondary" onClick={() => setReqs((all) => all.map((x) => (x.id === r.id ? { ...x, done: true } : x)))}>
                        {r.kind === 'SONG' ? 'Played' : 'Done'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
