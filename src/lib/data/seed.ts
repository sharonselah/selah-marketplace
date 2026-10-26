import { JOB_STATUS, TICKET_TIER } from '@/lib/constants/enums';
import { SEED_POLICY } from '@/lib/constants/policy';
import { kes } from '@/lib/format';
import type {
  AdCampaign,
  SelahEvent,
  AppNotification,
  ArtistId,
  ArtistPitch,
  AvailabilityBlock,
  Booking,
  BookingRequest,
  BusinessAccount,
  BusinessId,
  ContentItem,
  Contract,
  CreatorCampaign,
  CreatorProposal,
  Dispute,
  EarnEntry,
  Escrow,
  EventId,
  Flag,
  InventoryItem,
  Job,
  Minor,
  Order,
  PartyRef,
  Payout,
  Person,
  PersonId,
  Transaction,
  World,
} from '@/types';
import { bizRef, dayOffset, hoursAgo, makeArtist, makeBusiness, makeCreator, makeEscrow, makePerson, perRef, pick, times } from './factories';
import { BOTTLES, EVENT_TITLES, GENRES, VENUE_NAMES, cover } from './pools';

/**
 * The seeded world. Hero accounts carry the demo story (and the "Continue as" shortcuts);
 * filler populates directories; status galleries make sure every state renders somewhere.
 */
export function buildSeedWorld(): World {
  // ---------- People ----------
  const admin = makePerson(0, {
    id: 'per_admin',
    name: 'Selah Ops',
    email: 'ops@selah.co.ke',
    isAdmin: true,
    demo: { tagline: 'Platform admin: the whole system, seeded' },
  });

  const wanjiku = makePerson(1, {
    id: 'per_wanjiku',
    name: 'Wanjiku Mwangi',
    location: 'Kilimani, Nairobi',
    phone: '+254 712 345 678',
    email: 'wanjiku@example.co.ke',
    wallet: { balance: kes(4500) },
    referralCode: 'SLH254',
    demo: { tagline: 'Patron: buys tickets, books artists, earns rewards' },
  });

  const kaz = makePerson(2, {
    id: 'per_kaz',
    name: 'Kevin Otieno',
    phone: '+254 722 111 222',
    email: 'kaz@example.co.ke',
    verification: 'ID_VERIFIED',
    wallet: { balance: kes(18250) },
    demo: { tagline: 'Artist + Creator: gigs, store, brand jobs' },
  });
  kaz.artist = makeArtist(0, kaz.id, {
    stageName: 'DJ Kaz',
    category: 'DJ',
    capabilities: ['SELL_ARTIST_SERVICES', 'SELL_CREATOR_SERVICES'],
    bio: 'Amapiano and Afrobeats selector. Resident at Alchemist Lounge, regular on the Westlands circuit. Weddings, corporate and club nights.',
    genres: ['Amapiano', 'Afrobeats', 'House'],
    languages: ['English', 'Swahili', 'Sheng'],
    pricing: { booking: { kind: 'RANGE', min: kes(25000), max: kes(60000) }, songRequest: kes(200), shoutOut: kes(300) },
    verification: 'VERIFIED_ARTIST',
    rating: 4.8,
    gigsPlayed: 142,
    creator: { ...makeCreator(2, 18400), niche: ['Nightlife', 'Music'] },
  });

  const amani = makePerson(3, {
    id: 'per_amani',
    name: 'Amani Njeri',
    phone: '+254 733 444 555',
    email: 'amani@example.co.ke',
    verification: 'ID_VERIFIED',
    wallet: { balance: kes(6200) },
    demo: { tagline: 'Creator only: influence & insights jobs' },
  });
  amani.artist = makeArtist(1, amani.id, {
    stageName: 'Amani N.',
    category: 'OTHER',
    capabilities: ['SELL_CREATOR_SERVICES'],
    bio: 'Lifestyle and food creator. Honest reviews of Nairobi’s best spots.',
    creator: { ...makeCreator(3, 4200), niche: ['Lifestyle', 'Food & drink'] },
  });

  const brian = makePerson(4, {
    id: 'per_brian',
    name: 'Brian Kiprop',
    phone: '+254 711 999 888',
    email: 'brian@alchemist.co.ke',
    verification: 'ID_VERIFIED',
    businessIds: ['biz_alchemist'],
    demo: { tagline: 'MC who also owns a club: switch accounts' },
  });
  brian.artist = makeArtist(2, brian.id, { stageName: 'MC Brayo', category: 'MC_HOST', verification: 'ID_VERIFIED' });

  const achieng = makePerson(5, {
    id: 'per_achieng',
    name: 'Achieng Odhiambo',
    email: 'achieng@kilele.co.ke',
    businessIds: ['biz_kilele'],
    demo: { tagline: 'Brand manager: ads + creator campaigns' },
  });

  const mutua = makePerson(6, {
    id: 'per_mutua',
    name: 'Mutua Musyoka',
    email: 'mutua@nairobinights.co.ke',
    businessIds: ['biz_nairobinights'],
    demo: { tagline: 'Event organiser: books artists, sells tickets' },
  });

  // Directory filler: 16 artists (every 4th also a creator), 6 venue owners, plus patrons.
  const fillerArtists: Person[] = times(16, (i) => {
    const p = makePerson(10 + i, { id: `per_a${i}` });
    p.artist = makeArtist(3 + i, p.id);
    if (i % 4 === 0) {
      p.artist.capabilities = [...p.artist.capabilities, 'SELL_CREATOR_SERVICES'];
      p.artist.creator = makeCreator(i, [900, 7200, 45000, 160000][i / 4]);
    }
    return p;
  });
  const fillerCreators: Person[] = times(4, (i) => {
    const p = makePerson(40 + i, { id: `per_c${i}` });
    p.artist = makeArtist(20 + i, p.id, { category: 'OTHER', capabilities: ['SELL_CREATOR_SERVICES'], stageName: p.name });
    p.artist.creator = makeCreator(10 + i, [1800, 12000, 64000, 620000][i]);
    return p;
  });
  const venueOwners: Person[] = VENUE_NAMES.map((_, i) => makePerson(60 + i, { id: `per_v${i}`, businessIds: [`biz_v${i}`] }));
  const patrons: Person[] = times(8, (i) => makePerson(80 + i, { id: `per_p${i}` }));
  const jua = makePerson(90, { id: 'per_jua', businessIds: ['biz_jua'] });

  const people: Person[] = [admin, wanjiku, kaz, amani, brian, achieng, mutua, jua, ...fillerArtists, ...fillerCreators, ...venueOwners, ...patrons];

  // ---------- Businesses ----------
  const businesses: BusinessAccount[] = [
    makeBusiness({
      id: 'biz_alchemist',
      ownerId: brian.id,
      name: 'Alchemist Lounge',
      venueType: 'CLUB',
      address: 'Parklands Rd, Westlands, Nairobi',
      contactName: 'Brian Kiprop',
      capabilities: ['SELL_VENUE_INVENTORY', 'BUY_ARTIST_BOOKINGS'],
      preset: 'VENUE',
      wallet: { balance: kes(126400) },
    }),
    makeBusiness({
      id: 'biz_kilele',
      ownerId: achieng.id,
      name: 'Kilele Drinks',
      address: 'Industrial Area, Nairobi',
      contactName: 'Achieng Odhiambo',
      capabilities: ['BUY_AD_INVENTORY', 'COMMISSION_CREATOR_JOBS'],
      preset: 'BRAND',
      payout: undefined,
      billing: { mode: 'INVOICED', email: 'marketing@kilele.co.ke' },
      wallet: { balance: kes(350000) },
    }),
    makeBusiness({
      id: 'biz_nairobinights',
      ownerId: mutua.id,
      name: 'Nairobi Nights Events',
      address: 'Kilimani, Nairobi',
      contactName: 'Mutua Musyoka',
      capabilities: ['BUY_ARTIST_BOOKINGS', 'SELL_VENUE_INVENTORY'],
      preset: 'ORGANISER',
      wallet: { balance: kes(88000) },
    }),
    makeBusiness({
      id: 'biz_jua',
      ownerId: jua.id,
      name: 'Jua Energy',
      address: 'Mombasa Rd, Nairobi',
      capabilities: ['COMMISSION_CREATOR_JOBS'],
      preset: 'BRAND',
      payout: undefined,
    }),
    ...VENUE_NAMES.map((name, i) =>
      makeBusiness({
        id: `biz_v${i}`,
        ownerId: `per_v${i}`,
        name,
        venueType: (['LOUNGE', 'BAR', 'EVENT_SPACE', 'BAR', 'CLUB', 'LOUNGE'] as const)[i],
        address: `${pick(['Westlands', 'Kilimani', 'Karen', 'CBD', 'Lavington', 'Upper Hill'], i)}, Nairobi`,
        capabilities: ['SELL_VENUE_INVENTORY', 'BUY_ARTIST_BOOKINGS'],
        preset: 'VENUE',
        verified: i !== 5,
      }),
    ),
  ];

  const venueIds: BusinessId[] = ['biz_alchemist', ...VENUE_NAMES.map((_, i) => `biz_v${i}` as BusinessId), 'biz_nairobinights'];
  const allArtists = people.flatMap((p) => (p.artist && p.artist.capabilities.includes('SELL_ARTIST_SERVICES') ? [p.artist] : []));
  const artistIds = allArtists.map((a) => a.id);

  // ---------- Events & inventory ----------
  const events: SelahEvent[] = times(12, (i) => {
    const venueId = pick(venueIds, i);
    const status = i === 3 ? 'SOLD_OUT' : i === 10 ? 'COMPLETED' : i === 11 ? 'DRAFT' : 'PUBLISHED';
    return {
      id: `evt_${i}`,
      venueId: i === 11 ? 'biz_alchemist' : venueId,
      title: pick(EVENT_TITLES, i),
      description: `A night of ${pick(GENRES, i)} and ${pick(GENRES, i + 4)} with the city’s finest selectors. Dress code: smart casual. 18+.`,
      date: i === 10 ? dayOffset(-6, 21) : dayOffset(2 + i * 2, 21),
      cover: cover(i),
      genres: [pick(GENRES, i), pick(GENRES, i + 4)],
      status,
      lineup: i === 0 ? ['art_kaz', pick(artistIds, 3)] : [pick(artistIds, i + 1), pick(artistIds, i + 5)],
    };
  });

  const inventory: InventoryItem[] = [
    ...events.flatMap((e, i) =>
      TICKET_TIER.map(
        (tier, t): InventoryItem => ({
          id: `inv_${e.id}_${tier.toLowerCase()}`,
          venueId: e.venueId,
          type: 'TICKET',
          eventId: e.id,
          tier,
          name: `${e.title}: ${tier === 'EARLY_BIRD' ? 'Early bird' : tier === 'VIP' ? 'VIP' : 'Regular'}`,
          price: kes([800, 1500, 4000][t] + (i % 3) * 200),
          capacity: [100, 300, 50][t],
          sold: e.status === 'SOLD_OUT' ? [100, 300, 50][t] : [100, 120 + i * 5, 12 + i][t],
        }),
      ),
    ),
    ...venueIds.flatMap((v, i) => [
      ...times(3, (t): InventoryItem => ({
        id: `inv_${v}_table${t}`,
        venueId: v,
        type: 'TABLE',
        name: ['Standard table', 'VIP booth', 'Rooftop cabana'][t],
        capacity: [4, 8, 12][t],
        perks: [['Reserved seating'], ['Bottle of choice', 'Dedicated waiter'], ['2 bottles', 'Private host', 'Skip the queue']][t],
        price: kes([5000, 15000, 30000][t]),
        available: [6, 3, 1][t],
      })),
      ...times(3, (t): InventoryItem => ({
        id: `inv_${v}_drink${t}`,
        venueId: v,
        type: 'DRINK_PREORDER',
        name: pick(BOTTLES, i + t),
        description: 'Pre-order and it’s chilled and waiting at your table.',
        price: kes([4500, 3200, 12000][t]),
      })),
      ...times(2, (t): InventoryItem => ({
        id: `inv_${v}_ad${t}`,
        venueId: v,
        type: 'AD_SLOT',
        name: ['Main screen: prime time', 'Bar screens: all night'][t],
        screen: ['Main LED wall', 'Bar TVs (x4)'][t],
        reachEstimate: [1200, 600][t] + i * 150,
        slotLengthSec: [30, 15][t],
        status: 'AVAILABLE',
        price: kes([8000, 3500][t]),
      })),
    ]),
  ];

  // ---------- Content ----------
  const content: ContentItem[] = [
    { id: 'cnt_kaz1', artistId: 'art_kaz', type: 'PAID_MIX', title: 'Amapiano Sundowner Vol. 3', description: '90-minute Amapiano journey, recorded live.', price: kes(300), sales: 214, cover: cover(1) },
    { id: 'cnt_kaz2', artistId: 'art_kaz', type: 'SET', title: 'Live at Alchemist: NYE', description: 'Full 3-hour New Year set.', price: kes(500), sales: 88, cover: cover(4) },
    { id: 'cnt_kaz3', artistId: 'art_kaz', type: 'MERCH', title: 'DJ Kaz Tee (black)', description: 'Heavyweight cotton tee. Pick up at gigs.', price: kes(1500), sales: 41, cover: cover(6) },
    ...allArtists.slice(3, 15).map(
      (a, i): ContentItem => ({
        id: `cnt_${a.id.slice(4)}`,
        artistId: a.id,
        type: i % 4 === 3 ? 'MERCH' : 'PAID_MIX',
        title: i % 4 === 3 ? `${a.stageName} Cap` : `${a.genres[0]} Mix Vol. ${1 + (i % 3)}`,
        description: i % 4 === 3 ? 'Embroidered snapback.' : `An hour of ${a.genres[0]} heat.`,
        price: kes(i % 4 === 3 ? 1200 : 200 + (i % 3) * 100),
        sales: 10 + i * 9,
        cover: cover(i + 2),
      }),
    ),
  ];

  // ---------- Money helpers ----------
  const escrows: Escrow[] = [];
  const transactions: Transaction[] = [];
  let txn = 0;
  const tx = (t: Omit<Transaction, 'id'>) => transactions.push({ id: `txn_s${txn++}`, ...t });

  // ---------- Bookings: DJ Kaz's inbox as a status gallery ----------
  const bookingRequests: BookingRequest[] = [];
  const bookings: Booking[] = [];
  const contracts: Contract[] = [];
  type BrqSpec = { buyer: PartyRef; eventName: string; day: number; offer: number; status: BookingRequest['status']; booking?: Booking['status']; artist?: ArtistId };
  const brqSpecs: BrqSpec[] = [
    { buyer: bizRef('biz_alchemist'), eventName: 'Amapiano Fridays', day: 9, offer: 35000, status: 'PENDING' },
    { buyer: perRef('per_p0'), eventName: '30th birthday house party', day: 16, offer: 25000, status: 'PENDING' },
    { buyer: bizRef('biz_nairobinights'), eventName: 'Afro Sunset Sessions', day: 12, offer: 20000, status: 'NEGOTIATING' },
    { buyer: bizRef('biz_alchemist'), eventName: 'Throwback Thursday', day: 5, offer: 40000, status: 'ACCEPTED', booking: 'SCHEDULED' },
    { buyer: bizRef('biz_v0'), eventName: 'Rooftop Rhumba Night', day: -3, offer: 30000, status: 'ACCEPTED', booking: 'COMPLETED' },
    { buyer: perRef('per_p1'), eventName: 'Corporate year-end', day: -20, offer: 55000, status: 'ACCEPTED', booking: 'PAID' },
    { buyer: bizRef('biz_v2'), eventName: 'Sunday Chill & Grill', day: 20, offer: 15000, status: 'DECLINED' },
    { buyer: perRef('per_p2'), eventName: 'Graduation party', day: -8, offer: 18000, status: 'EXPIRED' },
    // Wanjiku (patron) has booked someone too
    { buyer: perRef('per_wanjiku'), eventName: 'Wanjiku’s birthday dinner', day: 18, offer: 15000, status: 'ACCEPTED', booking: 'SCHEDULED', artist: artistIds[4] },
    // Organiser and venue bookings with other artists
    { buyer: bizRef('biz_nairobinights'), eventName: 'Gengetone Takeover', day: 7, offer: 28000, status: 'ACCEPTED', booking: 'CONTRACT_SIGNED', artist: artistIds[5] },
    { buyer: bizRef('biz_alchemist'), eventName: 'Ladies Night Live', day: 11, offer: 22000, status: 'PENDING', artist: artistIds[6] },
  ];
  brqSpecs.forEach((s, i) => {
    const artistId = s.artist ?? 'art_kaz';
    const artistPerson = people.find((p) => p.artist?.id === artistId)!;
    const id = `brq_${i}` as const;
    const req: BookingRequest = {
      id,
      artistId,
      buyer: s.buyer,
      eventName: s.eventName,
      date: dayOffset(s.day, 21),
      location: s.buyer.kind === 'BUSINESS' ? businesses.find((b) => b.id === s.buyer.id)!.address : 'Private residence, Karen',
      durationHours: 4,
      offer: kes(s.offer),
      message: 'Hi! We’d love to have you. Set is 10pm–2am, sound system provided.',
      status: s.status,
      counterOffers:
        s.status === 'NEGOTIATING'
          ? [{ by: 'ARTIST', amount: kes(30000), note: 'My minimum for a 4-hour set is 30K, transport included.', at: hoursAgo(5) }]
          : [],
      createdAt: hoursAgo(10 + i * 9),
    };
    bookingRequests.push(req);
    if (!s.booking) return;
    const bkgId = `bkg_${i}` as const;
    const conId = `con_${i}` as const;
    const escId = `esc_b${i}` as const;
    req.bookingId = bkgId;
    bookings.push({ id: bkgId, requestId: id, artistId, buyer: s.buyer, eventName: s.eventName, date: req.date, location: req.location, fee: req.offer, status: s.booking, contractId: conId, escrowId: escId });
    contracts.push({
      id: conId,
      subject: { kind: 'BOOKING', id: bkgId },
      title: `Performance agreement: ${s.eventName}`,
      terms: ['4-hour performance set', 'Buyer provides sound system and security', 'Fee held in escrow until performance is completed', 'Cancellation within 48h forfeits 50%'],
      status: s.booking === 'PAID' || s.booking === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      signedBy: [s.buyer, perRef(artistPerson.id)],
      createdAt: hoursAgo(30 + i * 9),
    });
    const state = s.booking === 'PAID' ? 'RELEASED' : s.booking === 'COMPLETED' ? 'FULFILLED' : 'FUNDS_HELD';
    escrows.push(makeEscrow(escId, { kind: 'BOOKING', id: bkgId }, s.buyer, perRef(artistPerson.id), req.offer, state, 'BOOKING_COMPLETED', hoursAgo(30 + i * 9)));
    tx({ party: s.buyer, amount: req.offer, direction: 'OUT', description: `Booking: ${artistPerson.artist!.stageName}`, method: 'MPESA', status: state === 'RELEASED' ? 'RELEASED' : 'HELD', ref: { kind: 'BOOKING', id: bkgId }, at: hoursAgo(30 + i * 9) });
  });

  const availability: AvailabilityBlock[] = [
    ...bookings.filter((b) => b.artistId === 'art_kaz').map((b): AvailabilityBlock => ({ artistId: 'art_kaz', date: b.date, status: 'BOOKED', bookingId: b.id })),
    { artistId: 'art_kaz', date: dayOffset(9, 21), status: 'TENTATIVE', note: 'Alchemist request pending' },
    { artistId: 'art_kaz', date: dayOffset(14, 12), status: 'BLOCKED', note: 'Family wedding' },
    { artistId: 'art_kaz', date: dayOffset(15, 12), status: 'BLOCKED', note: 'Family wedding' },
  ];

  // ---------- Pitches ----------
  const pitches: ArtistPitch[] = [
    { id: 'pit_0', artistId: 'art_kaz', to: 'biz_v0', message: 'Would love a monthly Amapiano residency at Kiza.', fee: kes(35000), status: 'SENT', createdAt: hoursAgo(20) },
    { id: 'pit_1', artistId: 'art_kaz', to: 'biz_v1', eventId: 'evt_1', message: 'Happy to open for your rooftop night.', fee: kes(25000), status: 'VIEWED', createdAt: hoursAgo(50) },
    { id: 'pit_2', artistId: 'art_kaz', to: 'biz_v4', message: 'Afrobeats special, I bring the crowd.', fee: kes(30000), status: 'ACCEPTED', createdAt: hoursAgo(120) },
    { id: 'pit_3', artistId: 'art_kaz', to: 'biz_v3', message: 'Sunday chill set.', fee: kes(18000), status: 'DECLINED', createdAt: hoursAgo(200) },
    ...times(3, (i): ArtistPitch => ({
      id: `pit_in${i}`,
      artistId: artistIds[7 + i],
      to: 'biz_alchemist',
      message: ['Looking for a weekend slot, I play Gengetone and Dancehall.', 'Live band available for your Thursday nights.', 'Comedy + MC package for your ladies night.'][i],
      fee: kes([20000, 45000, 15000][i]),
      status: i === 2 ? 'VIEWED' : 'SENT',
      createdAt: hoursAgo(6 + i * 14),
    })),
  ];

  // ---------- Creator campaigns, proposals, jobs ----------
  const creatorIds = people.filter((p) => p.artist?.creator).map((p) => p.artist!.id);
  const campaigns: CreatorCampaign[] = [
    { id: 'cmp_k1', brandId: 'biz_kilele', title: 'Kilele Night Out', brief: 'Show your crew enjoying Kilele at a Nairobi night spot. Natural, fun, no hard sell.', jobType: 'INFLUENCE', tiers: ['MICRO', 'MACRO'], budget: kes(120000), feePerCreator: kes(15000), slots: 8, deadline: dayOffset(21, 18), deliverables: ['1 Instagram reel', '3 stories with link sticker'], status: 'OPEN', createdAt: hoursAgo(72) },
    { id: 'cmp_k2', brandId: 'biz_kilele', title: 'New flavour taste test', brief: 'Try our new passion-ginger flavour and give honest feedback via the survey.', jobType: 'INSIGHTS', tiers: ['NANO', 'MICRO'], budget: kes(30000), feePerCreator: kes(2500), slots: 12, deadline: dayOffset(10, 18), deliverables: ['Complete 8-question survey', 'One photo of the product'], status: 'OPEN', createdAt: hoursAgo(40) },
    { id: 'cmp_k3', brandId: 'biz_kilele', title: 'December campaign (draft)', brief: 'Festive season push. Details TBC.', jobType: 'INFLUENCE', tiers: ['MACRO', 'META'], budget: kes(400000), feePerCreator: kes(50000), slots: 6, deadline: dayOffset(50, 18), deliverables: ['TikTok video', 'Instagram reel'], status: 'DRAFT', createdAt: hoursAgo(10) },
    { id: 'cmp_k4', brandId: 'biz_kilele', title: 'Launch week', brief: 'Launch push for Kilele Lite.', jobType: 'INFLUENCE', tiers: ['MICRO'], budget: kes(60000), feePerCreator: kes(10000), slots: 6, deadline: dayOffset(-30, 18), deliverables: ['1 Instagram reel'], status: 'FILLED', createdAt: hoursAgo(1200) },
    { id: 'cmp_j1', brandId: 'biz_jua', title: 'Jua Energy: gym to club', brief: 'Show how Jua keeps you going from your evening workout to the dance floor.', jobType: 'INFLUENCE', tiers: ['NANO', 'MICRO'], budget: kes(50000), feePerCreator: kes(6000), slots: 8, deadline: dayOffset(14, 18), deliverables: ['1 TikTok video'], status: 'OPEN', createdAt: hoursAgo(30) },
  ];

  const proposals: CreatorProposal[] = [
    { id: 'prp_0', campaignId: 'cmp_k1', artistId: 'art_amani', pitch: 'I’ll do a Friday night food-crawl reel ending at a rooftop with Kilele.', price: kes(15000), status: 'SUBMITTED', createdAt: hoursAgo(20) },
    ...creatorIds.slice(2, 6).map((artistId, i): CreatorProposal => ({
      id: `prp_${i + 1}`,
      campaignId: 'cmp_k1',
      artistId,
      pitch: ['Club-hopping vlog with my squad.', 'Comedy skit: the friend who always forgets the drinks.', 'Dance challenge at the club.', 'Get-ready-with-me into a night out.'][i],
      price: kes(15000),
      status: (['SUBMITTED', 'SHORTLISTED', 'SHORTLISTED', 'REJECTED'] as const)[i],
      createdAt: hoursAgo(15 + i * 8),
    })),
    { id: 'prp_9', campaignId: 'cmp_j1', artistId: 'art_kaz', pitch: 'Warm-up workout to a club set, with Jua as the bridge.', price: kes(6000), status: 'SUBMITTED', createdAt: hoursAgo(12) },
  ];

  const jobs: Job[] = [];
  const pushJob = (j: Job, brand: BusinessId, creatorPerson: PersonId) => {
    jobs.push(j);
    const state = j.status === 'PAID' ? 'RELEASED' : j.status === 'CONFIRMED' ? 'FULFILLED' : 'FUNDS_HELD';
    escrows.push(makeEscrow(j.escrowId, { kind: 'JOB', id: j.id }, bizRef(brand), perRef(creatorPerson), j.fee, state, 'JOB_CONFIRMED'));
  };
  // DJ Kaz's creator jobs
  pushJob({ id: 'job_kaz1', campaignId: 'cmp_k1', artistId: 'art_kaz', source: 'DIRECT_INVITE', fee: kes(15000), escrowId: 'esc_jkaz1', drafts: [], inviteAccepted: false, jobType: 'INFLUENCE', status: 'ASSIGNED' }, 'biz_kilele', 'per_kaz');
  pushJob({ id: 'job_kaz2', campaignId: 'cmp_k4', artistId: 'art_kaz', source: 'OPEN_PROPOSAL', fee: kes(10000), escrowId: 'esc_jkaz2', drafts: [{ submittedAt: hoursAgo(50), note: 'First cut of the reel', feedback: 'Love it! Can the logo show in the first 3 seconds?' }], inviteAccepted: true, jobType: 'INFLUENCE', status: 'REVISION_REQUESTED', scheduledFor: dayOffset(3, 19) }, 'biz_kilele', 'per_kaz');
  pushJob({ id: 'job_kaz3', campaignId: 'cmp_k4', artistId: 'art_kaz', source: 'DIRECT_INVITE', fee: kes(10000), escrowId: 'esc_jkaz3', drafts: [{ submittedAt: hoursAgo(700), note: 'Final reel' }], inviteAccepted: true, jobType: 'INFLUENCE', status: 'PAID', postedUrl: 'https://instagram.com/p/kaz-kilele' }, 'biz_kilele', 'per_kaz');
  // Amani's insights job
  pushJob({ id: 'job_amani1', campaignId: 'cmp_k2', artistId: 'art_amani', source: 'DIRECT_INVITE', fee: kes(2500), escrowId: 'esc_jamani1', drafts: [], inviteAccepted: true, jobType: 'INSIGHTS', status: 'ASSIGNED' }, 'biz_kilele', 'per_amani');
  // Kilele's approval queue: one job per influence status
  JOB_STATUS.filter((s) => s !== 'CANCELLED').forEach((status, i) => {
    const creatorPerson = people.find((p) => p.artist?.id === pick(creatorIds, i + 2))!;
    pushJob(
      {
        id: `job_g${i}`,
        campaignId: 'cmp_k1',
        artistId: creatorPerson.artist!.id,
        source: i % 2 ? 'DIRECT_INVITE' : 'OPEN_PROPOSAL',
        fee: kes(15000),
        escrowId: `esc_jg${i}`,
        drafts: status === 'ASSIGNED' ? [] : [{ submittedAt: hoursAgo(20 + i * 5), note: 'Draft reel, 28s, music licensed.' }],
        inviteAccepted: true,
        jobType: 'INFLUENCE',
        status,
        postedUrl: ['POSTED', 'CONFIRMED', 'PAID'].includes(status) ? 'https://instagram.com/p/example' : undefined,
      },
      'biz_kilele',
      creatorPerson.id,
    );
  });

  // ---------- Ad campaigns ----------
  const adCampaigns: AdCampaign[] = [
    { id: 'adc_k1', brandId: 'biz_kilele', name: 'Kilele Weekend Screens', slotIds: ['inv_biz_alchemist_ad0', 'inv_biz_v0_ad0'], startDate: dayOffset(-4, 18), endDate: dayOffset(10, 23), budget: kes(80000), creative: [{ kind: 'VIDEO', name: 'kilele-15s.mp4' }], impressions: 6240, plays: 182, spend: kes(31000), status: 'RUNNING', escrowIds: ['esc_ad1', 'esc_ad1b'], createdAt: hoursAgo(110) },
    { id: 'adc_k2', brandId: 'biz_kilele', name: 'Launch week screens', slotIds: ['inv_biz_v1_ad1'], startDate: dayOffset(-40, 18), endDate: dayOffset(-33, 23), budget: kes(20000), creative: [{ kind: 'IMAGE', name: 'kilele-lite.png' }], impressions: 4100, plays: 96, spend: kes(20000), status: 'COMPLETED', escrowIds: ['esc_ad2'], invoiceNo: 'INV-2026-0412', createdAt: hoursAgo(980) },
  ];
  for (const slot of inventory) if (slot.type === 'AD_SLOT' && adCampaigns[0].slotIds.includes(slot.id)) slot.status = 'BOOKED';
  escrows.push(makeEscrow('esc_ad1', { kind: 'AD_CAMPAIGN', id: 'adc_k1' }, bizRef('biz_kilele'), bizRef('biz_alchemist'), kes(40000), 'FUNDS_HELD', 'AD_RUN_COMPLETED'));
  escrows.push(makeEscrow('esc_ad1b', { kind: 'AD_CAMPAIGN', id: 'adc_k1' }, bizRef('biz_kilele'), bizRef('biz_v0'), kes(40000), 'FUNDS_HELD', 'AD_RUN_COMPLETED'));
  tx({ party: bizRef('biz_kilele'), amount: kes(80000), direction: 'OUT', description: 'Ad campaign: Kilele Weekend Screens', method: 'WALLET', status: 'HELD', ref: { kind: 'AD_CAMPAIGN', id: 'adc_k1' }, at: hoursAgo(110) });
  tx({ party: bizRef('biz_kilele'), amount: kes(20000), direction: 'OUT', description: 'Ad campaign: Launch week screens (invoice INV-2026-0412)', status: 'RELEASED', ref: { kind: 'AD_CAMPAIGN', id: 'adc_k2' }, at: hoursAgo(980) });
  escrows.push(makeEscrow('esc_ad2', { kind: 'AD_CAMPAIGN', id: 'adc_k2' }, bizRef('biz_kilele'), bizRef('biz_v1'), kes(20000), 'RELEASED', 'AD_RUN_COMPLETED', hoursAgo(900)));

  // ---------- Orders ----------
  const orders: Order[] = [];
  const priceOf = (id: string) => inventory.find((x) => x.id === id)!.price;
  const nameOf = (id: string) => inventory.find((x) => x.id === id)!.name;
  const addOrder = (id: `ord_${string}`, buyer: PartyRef, venueId: BusinessId, eventId: EventId | undefined, lines: [string, number][], status: Order['status'], hours: number) => {
    const ls = lines.map(([itemId, qty]) => ({ itemId: itemId as `inv_${string}`, name: nameOf(itemId), qty, unit: priceOf(itemId) }));
    const total = ls.reduce((a, l) => a + l.unit * l.qty, 0) as Minor;
    const state = status === 'COMPLETED' ? 'RELEASED' : status === 'FULFILLED' ? 'FULFILLED' : status === 'DISPUTED' ? 'DISPUTED' : 'FUNDS_HELD';
    const escrowId = `esc_${id.slice(4)}` as const;
    orders.push({ id, buyer, seller: bizRef(venueId), eventId, lines: ls, total, status, paymentMethod: 'MPESA', qrCode: `SELAH-${id.toUpperCase()}`, escrowId, createdAt: hoursAgo(hours) });
    escrows.push(makeEscrow(escrowId, { kind: 'ORDER', id }, buyer, bizRef(venueId), total, state, 'TICKET_SCANNED', hoursAgo(hours)));
    tx({ party: buyer, amount: total, direction: 'OUT', description: `Order: ${ls[0].name}`, method: 'MPESA', status: state === 'RELEASED' ? 'RELEASED' : state === 'DISPUTED' ? 'DISPUTED' : 'HELD', ref: { kind: 'ORDER', id }, at: hoursAgo(hours) });
  };
  addOrder('ord_w1', perRef('per_wanjiku'), events[0].venueId, 'evt_0', [['inv_evt_0_regular', 2]], 'PAID', 30);
  addOrder('ord_w2', perRef('per_wanjiku'), events[10].venueId, 'evt_10', [['inv_evt_10_vip', 1], [`inv_${events[10].venueId}_drink0`, 1]], 'COMPLETED', 200);
  times(8, (i) =>
    addOrder(
      `ord_a${i}`,
      perRef(`per_p${i}`),
      'biz_alchemist',
      'evt_0',
      i % 3 === 0 ? [['inv_biz_alchemist_table1', 1], ['inv_biz_alchemist_drink0', 1]] : [[`inv_evt_0_${pick(['early_bird', 'regular', 'vip'], i)}`, 1 + (i % 3)]],
      (['PAID', 'PAID', 'FULFILLED', 'PAID', 'COMPLETED', 'DISPUTED', 'PAID', 'FULFILLED'] as const)[i],
      4 + i * 6,
    ),
  );

  // ---------- Disputes ----------
  const disputes: Dispute[] = [
    { id: 'dsp_0', escrowId: 'esc_a5', raisedBy: perRef('per_p5'), reason: 'Table not honoured', details: 'Arrived at 10pm, our booked table had been given away.', status: 'OPEN', createdAt: hoursAgo(14) },
    { id: 'dsp_1', escrowId: 'esc_b4', raisedBy: bizRef('biz_v0'), reason: 'Artist arrived late', details: 'DJ arrived 90 minutes late; requesting partial refund.', status: 'UNDER_REVIEW', createdAt: hoursAgo(40) },
  ];

  // ---------- Reported content ----------
  const flags: Flag[] = [
    { id: 'flg_0', target: { kind: 'EVENT', id: 'evt_5' }, raisedBy: perRef('per_p3'), reason: 'Misleading listing', details: 'Poster says free entry before 10pm but tickets are charged all night.', status: 'OPEN', createdAt: hoursAgo(9) },
    { id: 'flg_1', target: { kind: 'BUSINESS', id: 'biz_v1' }, raisedBy: perRef('per_p4'), reason: 'Impersonation or fake account', details: 'This page is using photos from a different club in Westlands.', status: 'OPEN', createdAt: hoursAgo(26) },
    { id: 'flg_2', target: { kind: 'CONTENT', id: 'cnt_kaz2' }, raisedBy: perRef('per_p6'), reason: 'Stolen or copyrighted content', details: 'Thought this was someone else’s set, my mistake.', status: 'DISMISSED', note: 'The set was recorded by the artist at Alchemist; no issue found.', createdAt: hoursAgo(120) },
  ];

  // ---------- Wallet history & payouts ----------
  tx({ party: perRef('per_wanjiku'), amount: kes(5000), direction: 'IN', description: 'Wallet top-up', method: 'MPESA', status: 'RELEASED', ref: { kind: 'TOPUP' }, at: hoursAgo(260) });
  tx({ party: perRef('per_wanjiku'), amount: kes(200), direction: 'IN', description: 'Referral reward: Otieno', status: 'RELEASED', ref: { kind: 'REWARD', id: 'ern_w1' }, at: hoursAgo(90) });
  const payouts: Payout[] = times(4, (i): Payout => ({ id: `pay_k${i}`, party: perRef('per_kaz'), amount: kes([42000, 28500, 61000, 19000][i]), method: 'MPESA', status: 'RELEASED', at: hoursAgo(170 * (i + 1)) }));
  payouts.forEach((p) => tx({ party: p.party, amount: p.amount, direction: 'OUT', description: 'Payout to M-Pesa', status: 'RELEASED', ref: { kind: 'PAYOUT', id: p.id }, at: p.at }));
  payouts.push({ id: 'pay_alc0', party: bizRef('biz_alchemist'), amount: kes(184000), method: 'BANK', status: 'RELEASED', at: hoursAgo(160) });
  // Large withdrawals waiting in the admin payout queue (over policy payoutReviewAbove); already reserved from wallets.
  const queued: Payout[] = [
    { id: 'pay_kq1', party: perRef('per_kaz'), amount: kes(72000), method: 'MPESA', status: 'PENDING', source: 'REQUEST', at: hoursAgo(5) },
    { id: 'pay_alq1', party: bizRef('biz_alchemist'), amount: kes(126000), method: 'BANK', status: 'PENDING', source: 'REQUEST', at: hoursAgo(19) },
  ];
  queued.forEach((p) => tx({ party: p.party, amount: p.amount, direction: 'OUT', description: `Payout to ${p.method === 'MPESA' ? 'M-Pesa' : 'bank'}`, status: 'PENDING', ref: { kind: 'PAYOUT', id: p.id }, at: p.at }));
  payouts.unshift(...queued);

  // ---------- Earn with Selah ----------
  const earn: EarnEntry[] = [
    { id: 'ern_w1', personId: 'per_wanjiku', programme: 'REFERRAL', inviteeName: 'Otieno K.', inviteeId: 'per_p6', activated: true, reward: kes(200), rewardStatus: 'PAID', createdAt: hoursAgo(300) },
    { id: 'ern_w2', personId: 'per_wanjiku', programme: 'REFERRAL', inviteeName: 'Chebet A.', activated: false, reward: kes(250), rewardStatus: 'PENDING', createdAt: hoursAgo(30) },
    { id: 'ern_w3', personId: 'per_wanjiku', programme: 'ARTIST_RECRUITMENT', leadName: 'DJ Mzee', leadPhone: '+254 701 222 333', leadStatus: 'CONTACTED', reward: kes(1500), rewardStatus: 'PENDING', createdAt: hoursAgo(70) },
    { id: 'ern_p1', personId: 'per_p3', programme: 'BECOME_A_MODEL', note: 'Runway & brand activations, 2 yrs experience.', reward: kes(500), rewardStatus: 'PENDING', createdAt: hoursAgo(20) },
    { id: 'ern_p2', personId: 'per_p4', programme: 'LYRIC_CONTRIBUTION', song: 'Wamlambez (Sailors)', excerpt: 'Wamlambez! Wamnyonyez!…', reward: kes(150), rewardStatus: 'PENDING', createdAt: hoursAgo(8) },
    { id: 'ern_p3', personId: 'per_p5', programme: 'ARTIST_RECRUITMENT', leadName: 'The Benga Boys', leadPhone: '+254 702 555 666', leadStatus: 'ONBOARDED', reward: kes(1500), rewardStatus: 'APPROVED', createdAt: hoursAgo(140) },
  ];

  // ---------- Notifications ----------
  const n = (i: number, to: PartyRef, event: AppNotification['event'], title: string, body: string, href: string, hours: number, read = false): AppNotification => ({
    id: `ntf_s${i}`,
    to,
    event,
    channel: 'IN_APP',
    title,
    body,
    href,
    at: hoursAgo(hours),
    read,
  });
  const notifications: AppNotification[] = [
    n(0, perRef('per_wanjiku'), 'TICKET_PURCHASED', 'Tickets confirmed', '2 × Regular for Amapiano Fridays. Show your QR at the door.', '/orders/ord_w1', 30),
    n(1, perRef('per_wanjiku'), 'BOOKING_ACCEPTED', 'Booking accepted', 'Your birthday dinner booking was accepted.', '/my-bookings', 50, true),
    n(2, perRef('per_kaz'), 'BOOKING_REQUESTED', 'New booking request', 'Alchemist Lounge wants you for Amapiano Fridays.', '/artist/gigs/brq_0', 10),
    n(3, perRef('per_kaz'), 'JOB_ASSIGNED', 'You’re invited!', 'Kilele Drinks invited you to “Kilele Night Out”.', '/creator/inbox', 18),
    n(4, perRef('per_kaz'), 'PAYMENT_RELEASED', 'Payment released', 'KES 49,500 from Corporate year-end is now in your wallet.', '/artist/earnings', 80, true),
    n(5, bizRef('biz_alchemist'), 'TICKET_PURCHASED', '3 new orders tonight', 'Amapiano Fridays is selling fast.', '/biz/check-in', 4),
    n(6, bizRef('biz_kilele'), 'DRAFT_SUBMITTED', 'Draft ready for review', 'A creator submitted a draft for “Kilele Night Out”.', '/biz/jobs', 6),
  ];

  return {
    people,
    businesses,
    events,
    inventory,
    content,
    availability,
    bookingRequests,
    bookings,
    pitches,
    contracts,
    campaigns,
    proposals,
    jobs,
    adCampaigns,
    promos: [
      { id: 'prm_kaz1', artistId: 'art_kaz', contentId: 'cnt_kaz1', title: 'Boost: Amapiano Sundowner Vol. 3', budget: kes(2000), days: 7, impressions: 8400, clicks: 312, status: 'COMPLETED', createdAt: hoursAgo(400) },
    ],
    orders,
    escrows,
    transactions,
    payouts,
    disputes,
    flags,
    earn,
    notifications,
    policy: SEED_POLICY,
  };
}
