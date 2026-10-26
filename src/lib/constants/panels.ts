import type { BusinessCapability, Capability, Preset } from './enums';

// Guardrail 2: Dashboard = base panels + union(panels of every enabled capability).

export const PANEL = {
  // Base (every person)
  HOME: { label: 'Home', href: '/home', icon: 'home' },
  DISCOVER: { label: 'Discover', href: '/discover', icon: 'search' },
  ORDERS: { label: 'My orders', href: '/orders', icon: 'ticket' },
  MY_BOOKINGS: { label: 'My bookings', href: '/my-bookings', icon: 'calendar' },
  WALLET: { label: 'Wallet', href: '/wallet', icon: 'wallet' },
  EARN: { label: 'Earn with Selah', href: '/earn', icon: 'gift' },
  // SELL_ARTIST_SERVICES
  ARTIST_DASHBOARD: { label: 'Artist studio', href: '/artist', icon: 'mic' },
  PRICING: { label: 'Pricing', href: '/artist/pricing', icon: 'receipt' },
  GIGS: { label: 'Gigs & requests', href: '/artist/gigs', icon: 'inbox' },
  CALENDAR: { label: 'Calendar', href: '/artist/calendar', icon: 'calendar' },
  PITCHES: { label: 'Proposals', href: '/artist/pitches', icon: 'send' },
  STORE: { label: 'Store & content', href: '/artist/store', icon: 'bag' },
  PROMO: { label: 'Promo', href: '/artist/promo', icon: 'megaphone' },
  LIVE: { label: 'Live requests', href: '/artist/live', icon: 'radio' },
  ARTIST_EARNINGS: { label: 'Earnings', href: '/artist/earnings', icon: 'chart' },
  // SELL_CREATOR_SERVICES
  CREATOR_PROFILE: { label: 'Creator profile', href: '/creator', icon: 'star' },
  JOB_INBOX: { label: 'Job inbox', href: '/creator/inbox', icon: 'inbox' },
  ACTIVE_JOBS: { label: 'Active jobs', href: '/creator/jobs', icon: 'briefcase' },
  CREATOR_EARNINGS: { label: 'Creator earnings', href: '/creator/earnings', icon: 'chart' },
  // SELL_VENUE_INVENTORY
  INVENTORY: { label: 'Inventory', href: '/biz/inventory', icon: 'box' },
  EVENTS: { label: 'Events', href: '/biz/events', icon: 'sparkles' },
  CHECK_IN: { label: 'Orders & check-in', href: '/biz/check-in', icon: 'qr' },
  AD_SLOTS: { label: 'Ad slots', href: '/biz/ad-slots', icon: 'screen' },
  VENUE_PAYOUTS: { label: 'Payouts & reports', href: '/biz/payouts', icon: 'chart' },
  // BUY_ARTIST_BOOKINGS
  ARTIST_DIRECTORY: { label: 'Artist directory', href: '/biz/artists', icon: 'users' },
  BOOKINGS: { label: 'Bookings', href: '/biz/bookings', icon: 'calendar' },
  CONTRACTS: { label: 'Contracts', href: '/biz/contracts', icon: 'pen' },
  // BUY_AD_INVENTORY
  AD_MARKETPLACE: { label: 'Ad marketplace', href: '/biz/ads', icon: 'screen' },
  AD_CAMPAIGNS: { label: 'Ad campaigns', href: '/biz/ads/campaigns', icon: 'megaphone' },
  BILLING: { label: 'Billing', href: '/biz/billing', icon: 'receipt' },
  // COMMISSION_CREATOR_JOBS
  CREATOR_CAMPAIGNS: { label: 'Creator campaigns', href: '/biz/campaigns', icon: 'megaphone' },
  CREATOR_DIRECTORY: { label: 'Creator directory', href: '/biz/creators', icon: 'users' },
  JOB_APPROVAL: { label: 'Job approval', href: '/biz/jobs', icon: 'check' },
  // Business base (any business account)
  BIZ_HOME: { label: 'Business home', href: '/biz', icon: 'home' },
  BIZ_SETTINGS: { label: 'Business settings', href: '/biz/settings', icon: 'settings' },
} as const satisfies Record<string, { label: string; href: string; icon: string }>;

export type PanelId = keyof typeof PANEL;

export const PERSON_BASE_PANELS = ['HOME', 'DISCOVER', 'ORDERS', 'MY_BOOKINGS', 'WALLET', 'EARN'] as const satisfies readonly PanelId[];
export const BUSINESS_BASE_PANELS = ['BIZ_HOME', 'DISCOVER', 'ORDERS', 'WALLET'] as const satisfies readonly PanelId[];
export const BUSINESS_TAIL_PANELS = ['BIZ_SETTINGS'] as const satisfies readonly PanelId[];

export const PANELS_BY_CAPABILITY = {
  SELL_ARTIST_SERVICES: ['ARTIST_DASHBOARD', 'PRICING', 'GIGS', 'CALENDAR', 'PITCHES', 'STORE', 'PROMO', 'LIVE', 'ARTIST_EARNINGS'],
  SELL_CREATOR_SERVICES: ['CREATOR_PROFILE', 'JOB_INBOX', 'ACTIVE_JOBS', 'CREATOR_EARNINGS'],
  SELL_VENUE_INVENTORY: ['INVENTORY', 'EVENTS', 'CHECK_IN', 'AD_SLOTS', 'VENUE_PAYOUTS'],
  BUY_ARTIST_BOOKINGS: ['ARTIST_DIRECTORY', 'BOOKINGS', 'CONTRACTS'],
  BUY_AD_INVENTORY: ['AD_MARKETPLACE', 'AD_CAMPAIGNS', 'BILLING'],
  COMMISSION_CREATOR_JOBS: ['CREATOR_CAMPAIGNS', 'CREATOR_DIRECTORY', 'JOB_APPROVAL'],
} as const satisfies Record<Capability, readonly PanelId[]>;

// Presets are onboarding shortcuts stored as flag combos, never types (Guardrail 4).
export const BUSINESS_PRESETS = {
  VENUE: ['SELL_VENUE_INVENTORY', 'BUY_ARTIST_BOOKINGS'],
  ORGANISER: ['BUY_ARTIST_BOOKINGS', 'SELL_VENUE_INVENTORY'],
  BRAND: ['BUY_AD_INVENTORY', 'COMMISSION_CREATOR_JOBS'],
  CUSTOM: [],
} as const satisfies Partial<Record<Preset, readonly BusinessCapability[]>>;
export type BusinessPreset = keyof typeof BUSINESS_PRESETS;

export const BUSINESS_PRESET_BLURB: Record<BusinessPreset, string> = {
  VENUE: 'Clubs, bars and lounges. Sell tables, tickets and bottles; book artists.',
  ORGANISER: 'Event promoters. Book artists and sell tickets to your events.',
  BRAND: 'Advertise on venue screens and run creator campaigns.',
  CUSTOM: 'Pick exactly the capabilities you need.',
};

export const SELL_SIDE_CAPABILITIES: readonly Capability[] = ['SELL_ARTIST_SERVICES', 'SELL_CREATOR_SERVICES', 'SELL_VENUE_INVENTORY'];
