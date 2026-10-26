// Profile photos for seeded accounts (Pexels, free to use), stored in public/images/avatars.
// Looked up by display name so Avatar works everywhere without threading ids, and so worlds
// already saved in localStorage pick the photos up too.
import { buildSeedWorld } from './seed';

const BY_ID: Record<string, string> = {
  per_admin: 'selah-admin',
  per_wanjiku: 'wanjiku',
  per_kaz: 'dj-kaz',
  per_amani: 'amani',
  per_brian: 'mc-brayo',
  per_achieng: 'achieng',
  per_mutua: 'mutua',
  per_a0: 'the-vybz',
  per_a1: 'selector-nyota',
  per_a2: 'bass',
  per_a3: 'dj-kenji',
  per_a4: 'dj-lulu',
  per_a5: 'mc-rafiki',
  per_a6: 'the-zuri',
  per_a7: 'selector-tembo',
  per_a8: 'simba',
  per_a9: 'dj-pili',
  per_a10: 'mc-neno',
  per_a11: 'dj-kito',
  per_a12: 'mc-jua',
  per_a13: 'selector-shiru',
  per_a14: 'kace',
  per_a15: 'dj-mzee',
  per_p6: 'chebet',
  per_p7: 'omondi',
  biz_alchemist: 'biz-alchemist',
  biz_kilele: 'biz-kilele',
  biz_nairobinights: 'biz-nairobinights',
  biz_jua: 'biz-jua',
  biz_v0: 'biz-kiza',
  biz_v1: 'biz-mercury',
  biz_v2: 'biz-waterfront',
  biz_v3: 'biz-baobox',
  biz_v4: 'biz-nyamamama',
  biz_v5: 'biz-skydeck',
};

let byName: Map<string, string> | undefined;

function index(): Map<string, string> {
  if (byName) return byName;
  byName = new Map();
  const world = buildSeedWorld();
  const add = (name: string | undefined, id: string) => {
    const file = BY_ID[id];
    if (name && file && !byName!.has(name)) byName!.set(name, `/images/avatars/${file}.jpg`);
  };
  // Artists first so filler people who share an artist's name get that artist's face.
  for (const p of world.people) add(p.artist?.stageName, p.id);
  for (const p of world.people) add(p.name, p.id);
  for (const b of world.businesses) add(b.name, b.id);
  return byName;
}

export function avatarPhoto(name: string): string | undefined {
  return index().get(name);
}

// Event art: each cover key (g0…g7) is backed by a real crowd/venue photo, so the
// organiser's cover choice and the rendered tile always agree.
const EVENT_PHOTOS = ['event-1', 'event-2', 'event-3', 'event-4', 'event-5', 'event-6', 'venue-rooftop', 'venue-lounge'];

export function eventPhoto(cover: string): string {
  const n = Number(cover.replace(/\D/g, '')) || 0;
  return `/images/home/${EVENT_PHOTOS[n % EVENT_PHOTOS.length]}.jpg`;
}
