import type {
  AdSlotStatus,
  ArtistCapability,
  ArtistCategory,
  ArtistPitchStatus,
  AvailabilityStatus,
  BookingRequestStatus,
  BookingStatus,
  BusinessCapability,
  CampaignStatus,
  CommissionType,
  ContentType,
  ContractStatus,
  CreatorProposalStatus,
  CreatorTier,
  DisputeStatus,
  EscrowState,
  EventStatus,
  FlagStatus,
  FulfillmentTrigger,
  JobSource,
  JobStatus,
  JobType,
  LeadStatus,
  NotificationChannel,
  NotificationEvent,
  OrderStatus,
  PaymentMethod,
  PayoutMethod,
  PayoutSchedule,
  Preset,
  RewardStatus,
  SellerType,
  TicketTier,
  TransactionStatus,
  VenueType,
  VerificationTier,
} from '@/lib/constants/enums';
import type { PolicyVersion } from '@/lib/constants/policy';

// ---------- IDs ----------
// Template-literal IDs: a PersonId can't be passed where a BusinessId is expected,
// yet seed data can still be written as plain string literals.
export type PersonId = `per_${string}`;
export type ArtistId = `art_${string}`;
export type BusinessId = `biz_${string}`;
export type EventId = `evt_${string}`;
export type InventoryId = `inv_${string}`;
export type OrderId = `ord_${string}`;
export type BookingRequestId = `brq_${string}`;
export type BookingId = `bkg_${string}`;
export type PitchId = `pit_${string}`;
export type ContractId = `con_${string}`;
export type ContentId = `cnt_${string}`;
export type CampaignId = `cmp_${string}`;
export type ProposalId = `prp_${string}`;
export type JobId = `job_${string}`;
export type AdCampaignId = `adc_${string}`;
export type EscrowId = `esc_${string}`;
export type TransactionId = `txn_${string}`;
export type PayoutId = `pay_${string}`;
export type DisputeId = `dsp_${string}`;
export type EarnId = `ern_${string}`;
export type NotificationId = `ntf_${string}`;
export type PromoId = `prm_${string}`;
export type FlagId = `flg_${string}`;

/** ISO 8601 date-time string. */
export type ISODate = string;

// ---------- Money ----------
/** Integer KES cents. Never a float; build with `kes()` from lib/format. */
export type Minor = number & { readonly __unit: 'KES_MINOR' };

export type PriceOrRange = { kind: 'FIXED'; amount: Minor } | { kind: 'RANGE'; min: Minor; max: Minor };

// ---------- Parties ----------
export type PartyRef = { kind: 'PERSON'; id: PersonId } | { kind: 'BUSINESS'; id: BusinessId };

export interface PayoutAccount {
  method: PayoutMethod;
  /** M-Pesa number or masked bank account. */
  account: string;
  bankName?: string;
  schedule: PayoutSchedule;
  verified: boolean;
}

export interface BillingAccount {
  mode: 'PREPAID_WALLET' | 'INVOICED';
  email: string;
}

// ---------- Identity ----------
export interface Person {
  id: PersonId;
  name: string;
  photo?: string;
  location: string;
  phone: string;
  email?: string;
  createdAt: ISODate;
  verification: VerificationTier;
  wallet: { balance: Minor };
  /** Present once the Artist role is added. */
  artist?: ArtistProfile;
  businessIds: BusinessId[];
  referralCode: string;
  /** Seeded system operator; not reachable through signup. */
  isAdmin?: boolean;
  /** Seeded world members flagged as demo shortcuts on the login screen. */
  demo?: { tagline: string };
  referredBy?: PersonId;
  prefs?: PersonPrefs;
}

export interface PersonPrefs {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  language: 'EN' | 'SW';
  notify: Record<'SMS' | 'PUSH' | 'EMAIL', boolean>;
  profilePublic: boolean;
  payout?: PayoutAccount;
}

export interface MediaItem {
  kind: 'MIX' | 'PHOTO' | 'REEL';
  title: string;
  url: string;
}

export interface ArtistProfile {
  id: ArtistId;
  personId: PersonId;
  stageName: string;
  capabilities: ArtistCapability[];
  sellerType: SellerType;
  sellerBusiness?: { name: string; regTaxId: string };
  category: ArtistCategory;
  bio: string;
  genres: string[];
  languages: string[];
  media: MediaItem[];
  location: string;
  travelRadiusKm: number;
  pricing: { booking: PriceOrRange; songRequest: Minor; shoutOut: Minor };
  payout?: PayoutAccount;
  verification: VerificationTier;
  rating: number;
  gigsPlayed: number;
  creator?: CreatorProfile;
}

export interface CreatorProfile {
  niche: string[];
  rateCard: { deliverable: string; price: Minor }[];
  socials: { platform: 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'X'; handle: string; followers: number }[];
  tier: CreatorTier;
  followerCount: number;
  tierLastVerifiedAt: ISODate;
}

/** One object for every business. Venue / Brand / Organiser are derived labels. */
export interface BusinessAccount {
  id: BusinessId;
  ownerId: PersonId;
  name: string;
  regTaxId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  venueType?: VenueType;
  logo?: string;
  capabilities: BusinessCapability[];
  preset: Preset;
  verified: boolean;
  payout?: PayoutAccount;
  billing?: BillingAccount;
  wallet: { balance: Minor };
  createdAt: ISODate;
}

// ---------- Selling inventory ----------
interface InventoryBase {
  id: InventoryId;
  venueId: BusinessId;
  name: string;
  price: Minor;
}
export type InventoryItem = InventoryBase &
  (
    | { type: 'TABLE'; capacity: number; perks: string[]; available: number }
    | { type: 'DRINK_PREORDER'; description: string }
    | { type: 'TICKET'; eventId: EventId; tier: TicketTier; capacity: number; sold: number }
    | { type: 'AD_SLOT'; screen: string; reachEstimate: number; status: AdSlotStatus; slotLengthSec: number }
  );

export interface SelahEvent {
  id: EventId;
  venueId: BusinessId;
  title: string;
  description: string;
  date: ISODate;
  cover: string;
  genres: string[];
  status: EventStatus;
  lineup: ArtistId[];
}

export interface ContentItem {
  id: ContentId;
  artistId: ArtistId;
  type: ContentType;
  title: string;
  description: string;
  price: Minor;
  sales: number;
  cover: string;
}

export interface AvailabilityBlock {
  artistId: ArtistId;
  date: ISODate;
  status: AvailabilityStatus;
  bookingId?: BookingId;
  note?: string;
}

// ---------- Deals ----------
export interface CounterOffer {
  by: 'ARTIST' | 'BUYER';
  amount: Minor;
  note: string;
  at: ISODate;
}

export interface BookingRequest {
  id: BookingRequestId;
  artistId: ArtistId;
  buyer: PartyRef;
  eventName: string;
  date: ISODate;
  location: string;
  durationHours: number;
  offer: Minor;
  message: string;
  status: BookingRequestStatus;
  counterOffers: CounterOffer[];
  createdAt: ISODate;
  bookingId?: BookingId;
}

export interface Booking {
  id: BookingId;
  requestId: BookingRequestId;
  artistId: ArtistId;
  buyer: PartyRef;
  eventName: string;
  date: ISODate;
  location: string;
  fee: Minor;
  status: BookingStatus;
  contractId: ContractId;
  escrowId: EscrowId;
}

export interface ArtistPitch {
  id: PitchId;
  artistId: ArtistId;
  to: BusinessId;
  eventId?: EventId;
  message: string;
  fee: Minor;
  status: ArtistPitchStatus;
  createdAt: ISODate;
}

export interface Contract {
  id: ContractId;
  subject: { kind: 'BOOKING'; id: BookingId } | { kind: 'JOB'; id: JobId };
  title: string;
  terms: string[];
  status: ContractStatus;
  signedBy: PartyRef[];
  createdAt: ISODate;
}

export interface CreatorCampaign {
  id: CampaignId;
  brandId: BusinessId;
  title: string;
  brief: string;
  jobType: JobType;
  tiers: CreatorTier[];
  budget: Minor;
  feePerCreator: Minor;
  slots: number;
  deadline: ISODate;
  deliverables: string[];
  status: CampaignStatus;
  createdAt: ISODate;
}

export interface CreatorProposal {
  id: ProposalId;
  campaignId: CampaignId;
  artistId: ArtistId;
  pitch: string;
  price: Minor;
  status: CreatorProposalStatus;
  createdAt: ISODate;
}

export interface JobDraft {
  submittedAt: ISODate;
  note: string;
  feedback?: string;
}

interface JobBase {
  id: JobId;
  campaignId: CampaignId;
  artistId: ArtistId;
  source: JobSource;
  fee: Minor;
  escrowId: EscrowId;
  drafts: JobDraft[];
  scheduledFor?: ISODate;
  /** Direct invites start as pending until the creator accepts. */
  inviteAccepted: boolean;
}
// Guardrail 8: an INSIGHTS job has no posting step, so it can never be POSTED.
export type Job = JobBase &
  (
    | { jobType: 'INFLUENCE'; status: JobStatus; postedUrl?: string }
    | { jobType: 'INSIGHTS'; status: Exclude<JobStatus, 'POSTED'>; surveyAnswers?: string[] }
  );

export interface Promo {
  id: PromoId;
  artistId: ArtistId;
  contentId?: ContentId;
  title: string;
  budget: Minor;
  days: number;
  impressions: number;
  clicks: number;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: ISODate;
}

export interface AdCampaign {
  id: AdCampaignId;
  brandId: BusinessId;
  name: string;
  slotIds: InventoryId[];
  startDate: ISODate;
  endDate: ISODate;
  budget: Minor;
  creative: { kind: 'IMAGE' | 'VIDEO'; name: string }[];
  impressions: number;
  plays: number;
  spend: Minor;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED';
  /** One escrow per venue whose screens are booked. */
  escrowIds: EscrowId[];
  /** Set when the brand pays on invoice instead of up front. */
  invoiceNo?: string;
  createdAt: ISODate;
}

// ---------- Money spine ----------
export type EscrowSubject =
  | { kind: 'BOOKING'; id: BookingId }
  | { kind: 'ORDER'; id: OrderId }
  | { kind: 'JOB'; id: JobId }
  | { kind: 'AD_CAMPAIGN'; id: AdCampaignId };

export interface OrderLine {
  itemId: InventoryId | ContentId;
  name: string;
  qty: number;
  unit: Minor;
}

export interface Order {
  id: OrderId;
  buyer: PartyRef;
  seller: PartyRef;
  eventId?: EventId;
  lines: OrderLine[];
  total: Minor;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  qrCode?: string;
  /** Table or area the venue assigned at check-in. */
  tableLabel?: string;
  escrowId: EscrowId;
  createdAt: ISODate;
}

export interface Split {
  type: CommissionType;
  to: PartyRef | 'PLATFORM';
  amount: Minor;
  policyVersion: string;
}

export interface Escrow {
  id: EscrowId;
  subject: EscrowSubject;
  payer: PartyRef;
  payee: PartyRef;
  amount: Minor;
  state: EscrowState;
  trigger: FulfillmentTrigger;
  heldAt?: ISODate;
  releaseAt?: ISODate;
  splits: Split[];
}

export type TransactionRef = EscrowSubject | { kind: 'TOPUP' } | { kind: 'PAYOUT'; id: PayoutId } | { kind: 'REWARD'; id: EarnId };

export interface Transaction {
  id: TransactionId;
  party: PartyRef;
  amount: Minor;
  direction: 'IN' | 'OUT';
  description: string;
  method?: PaymentMethod;
  status: TransactionStatus;
  ref: TransactionRef;
  at: ISODate;
}

/** PENDING waits for admin review, RELEASED has been sent, FAILED was rejected and returned to the wallet. */
export interface Payout {
  id: PayoutId;
  party: PartyRef;
  amount: Minor;
  method: PayoutMethod;
  status: TransactionStatus;
  /** Requested (or run, for scheduled payouts). */
  at: ISODate;
  source?: 'REQUEST' | 'SCHEDULE';
  settledAt?: ISODate;
  /** Admin reason, sent to the seller when a payout is rejected. */
  note?: string;
}

export interface Dispute {
  id: DisputeId;
  escrowId: EscrowId;
  raisedBy: PartyRef;
  reason: string;
  details: string;
  status: DisputeStatus;
  createdAt: ISODate;
}

// ---------- Trust & safety ----------
/** Things a user can report: public profiles and listings. Money problems go through disputes instead. */
export type FlagTarget =
  | { kind: 'ARTIST'; id: ArtistId }
  | { kind: 'BUSINESS'; id: BusinessId }
  | { kind: 'EVENT'; id: EventId }
  | { kind: 'CONTENT'; id: ContentId };

export interface Flag {
  id: FlagId;
  target: FlagTarget;
  raisedBy: PartyRef;
  reason: string;
  details: string;
  status: FlagStatus;
  createdAt: ISODate;
  /** Admin note sent to both parties on resolution. */
  note?: string;
}

// ---------- Earn with Selah ----------
interface EarnBase {
  id: EarnId;
  personId: PersonId;
  reward: Minor;
  rewardStatus: RewardStatus;
  createdAt: ISODate;
}
export type EarnEntry = EarnBase &
  (
    | { programme: 'REFERRAL'; inviteeName: string; inviteeId?: PersonId; activated: boolean }
    | { programme: 'ARTIST_RECRUITMENT'; leadName: string; leadPhone: string; leadStatus: LeadStatus }
    | { programme: 'BECOME_A_MODEL'; note: string }
    | { programme: 'LYRIC_CONTRIBUTION'; song: string; excerpt: string }
  );

// ---------- Notifications ----------
export interface AppNotification {
  id: NotificationId;
  to: PartyRef;
  event: NotificationEvent;
  channel: NotificationChannel;
  title: string;
  body: string;
  href?: string;
  at: ISODate;
  read: boolean;
}

// ---------- The whole fake backend ----------
export interface World {
  people: Person[];
  businesses: BusinessAccount[];
  events: SelahEvent[];
  inventory: InventoryItem[];
  content: ContentItem[];
  availability: AvailabilityBlock[];
  bookingRequests: BookingRequest[];
  bookings: Booking[];
  pitches: ArtistPitch[];
  contracts: Contract[];
  campaigns: CreatorCampaign[];
  proposals: CreatorProposal[];
  jobs: Job[];
  adCampaigns: AdCampaign[];
  promos: Promo[];
  orders: Order[];
  escrows: Escrow[];
  transactions: Transaction[];
  payouts: Payout[];
  disputes: Dispute[];
  flags: Flag[];
  earn: EarnEntry[];
  notifications: AppNotification[];
  policy: PolicyVersion[];
}

export interface Session {
  personId: PersonId;
  /** Which account the person is currently operating as (themselves or one of their businesses). */
  actingAs: PartyRef;
}
