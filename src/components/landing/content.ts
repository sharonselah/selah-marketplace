// Homepage copy and imagery. Photos are from Pexels (free to use), stored in public/images/home.
import { Building2, Megaphone, Mic2, PartyPopper, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const img = (name: string) => `/images/home/${name}.jpg`;

export const HERO_IMAGE = img('hero');
export const CTA_IMAGE = img('cta');
export const EARN_IMAGE = img('earn');
export const EVENT_IMAGES = [1, 2, 3, 4, 5, 6].map((n) => img(`event-${n}`));

export const SERVICES: { title: string; body: string; image: string; href: string }[] = [
  { title: 'Event tickets', body: 'Buy tickets in seconds with M-Pesa. Your QR code gets you through the door.', image: img('svc-tickets'), href: '/discover' },
  { title: 'Tables & bottles', body: 'Reserve a VIP table and pre-order bottles so they’re waiting when you arrive.', image: img('svc-tables'), href: '/discover' },
  { title: 'Book a DJ or artist', body: 'DJs, MCs, singers and live bands for your party, wedding or club night.', image: img('svc-artists'), href: '/discover' },
  { title: 'Hire creators', body: 'Run campaigns with creators and models. Pay per deliverable, released on approval.', image: img('svc-creators'), href: '/biz/campaigns/new' },
  { title: 'Venue screen ads', body: 'Put your brand on the screens of the busiest clubs and lounges in town.', image: img('svc-screens'), href: '/biz' },
  { title: 'Mixes & music', body: 'Buy exclusive mixes and live sets straight from the artists who made them.', image: img('svc-music'), href: '/discover' },
];

export type AudienceKey = 'partygoer' | 'artist' | 'creator' | 'venue' | 'brand';

export const AUDIENCES: { key: AudienceKey; label: string; icon: LucideIcon; title: string; image: string; points: string[]; cta: string; href: string }[] = [
  {
    key: 'partygoer',
    label: 'Partygoer',
    icon: PartyPopper,
    title: 'Plan the perfect night out',
    image: img('aud-partygoer'),
    points: ['Discover events, venues and artists near you', 'Pay with M-Pesa, card or your Selah wallet', 'Your money is held safely until the event happens', 'Earn rewards when friends join and buy'],
    cta: 'Create a free account',
    href: '/register',
  },
  {
    key: 'artist',
    label: 'DJ / Artist',
    icon: Mic2,
    title: 'Get booked and get paid on time',
    image: img('aud-artist'),
    points: ['Set your rates, availability and travel radius', 'The fee is in escrow before you leave home', 'Sell mixes, sets and merch to your fans', 'Take song requests and shout-outs live'],
    cta: 'Start as an artist',
    href: '/sell',
  },
  {
    key: 'creator',
    label: 'Creator / Model',
    icon: Sparkles,
    title: 'Turn your following into paid work',
    image: img('aud-creator'),
    points: ['Publish a rate card brands can book from', 'Accept campaign jobs that match your niche', 'Get paid as soon as the brand approves your work', 'Apply to become a Selah model'],
    cta: 'Start as a creator',
    href: '/sell',
  },
  {
    key: 'venue',
    label: 'Venue / Organiser',
    icon: Building2,
    title: 'Fill your venue every weekend',
    image: img('aud-venue'),
    points: ['Sell tickets, tables and bottle packages', 'Book DJs and hosts with a clear contract', 'Check guests in with a QR scan at the door', 'Earn from ads on your venue screens'],
    cta: 'Add a business account',
    href: '/onboarding/business',
  },
  {
    key: 'brand',
    label: 'Brand',
    icon: Megaphone,
    title: 'Reach people where the night happens',
    image: img('aud-brand'),
    points: ['Book screen time at top clubs and lounges', 'Run creator campaigns with escrow-backed payments', 'Pay on invoice with net-30 terms', 'Track every campaign from one dashboard'],
    cta: 'Advertise on Selah',
    href: '/onboarding/business',
  },
];

export const ARTISTS: { name: string; role: string; genres: string; from: number; rating: number; image: string }[] = [
  { name: 'DJ Marcus', role: 'DJ', genres: 'Afrobeats · Amapiano', from: 25000, rating: 4.9, image: img('artist-1') },
  { name: 'DJ Tracy', role: 'DJ', genres: 'Gengetone · Dancehall', from: 18000, rating: 4.8, image: img('artist-2') },
  { name: 'DJ Kevo', role: 'DJ', genres: 'House · Amapiano', from: 20000, rating: 4.9, image: img('artist-3') },
  { name: 'DJ Stacy', role: 'DJ', genres: 'Hip hop · R&B', from: 15000, rating: 4.7, image: img('artist-4') },
  { name: 'MC Brian', role: 'MC / Host', genres: 'Hype · Events', from: 12000, rating: 4.8, image: img('artist-5') },
  { name: 'Esther Grace', role: 'Vocalist', genres: 'Soul · Afro-pop', from: 30000, rating: 5.0, image: img('artist-6') },
  { name: 'Nicole & The Band', role: 'Live band', genres: 'Afro-fusion · Covers', from: 45000, rating: 4.9, image: img('artist-7') },
  { name: 'Felix Beats', role: 'Producer', genres: 'Mixes · Remixes', from: 10000, rating: 4.8, image: img('artist-8') },
];

export const VENUES: { name: string; area: string; body: string; image: string }[] = [
  { name: 'Skyline Rooftop', area: 'Westlands, Nairobi', body: 'Sundowners and city lights, with DJs every Friday and Saturday.', image: img('venue-rooftop') },
  { name: 'The Velvet Room', area: 'Kilimani, Nairobi', body: 'An intimate cocktail lounge with live soul and R&B nights.', image: img('venue-lounge') },
  { name: 'Driftwood Beach Bar', area: 'Diani', body: 'Barefoot parties on the sand, from Amapiano afternoons to full-moon raves.', image: img('venue-beach') },
];

export const TESTIMONIALS: { name: string; role: string; quote: string; rating: number; image: string }[] = [
  { name: 'Michelle K.', role: 'Partygoer, Kilimani', quote: 'I booked a table for my birthday in two minutes. The QR code got all ten of us in without any drama at the door.', rating: 5, image: img('person-1') },
  { name: 'DJ Kevin', role: 'DJ, Westlands', quote: 'No more chasing deposits. The fee is sitting in escrow before I even pack my controller, and it lands the morning after the gig.', rating: 5, image: img('person-2') },
  { name: 'Patrick Mwangi', role: 'Venue owner, Ngong Road', quote: 'Tickets, tables, bookings and screen ads all in one dashboard. Our Saturday nights have never been this organised.', rating: 5, image: img('person-3') },
  { name: 'Sharon A.', role: 'Content creator', quote: 'Brands book straight from my rate card and I get paid as soon as they approve. It feels like having a manager.', rating: 5, image: img('person-4') },
  { name: 'Brian Otieno', role: 'Event organiser', quote: 'I booked three DJs and an MC for our festival in one afternoon. Contracts, payments and reminders were all handled.', rating: 4, image: img('person-5') },
  { name: 'Grace W.', role: 'Partygoer, Mombasa', quote: 'I shared my referral code with the girls and earned enough rewards to cover my next ticket. Easy money.', rating: 5, image: img('person-6') },
];
