// Structure lives in enums (Part 8.1). Each enum is a readonly tuple so we get
// both a union type and an iterable list (dropdowns, filters, status galleries).

export const ROLE_TYPE = ['PATRON', 'ARTIST', 'BUSINESS_ACCOUNT', 'ADMIN'] as const;
export type RoleType = (typeof ROLE_TYPE)[number];

export const CAPABILITY = [
  'SELL_ARTIST_SERVICES',
  'SELL_CREATOR_SERVICES',
  'SELL_VENUE_INVENTORY',
  'BUY_ARTIST_BOOKINGS',
  'BUY_AD_INVENTORY',
  'COMMISSION_CREATOR_JOBS',
] as const;
export type Capability = (typeof CAPABILITY)[number];

export const ARTIST_CAPABILITY = ['SELL_ARTIST_SERVICES', 'SELL_CREATOR_SERVICES'] as const satisfies readonly Capability[];
export type ArtistCapability = (typeof ARTIST_CAPABILITY)[number];

export const BUSINESS_CAPABILITY = [
  'SELL_VENUE_INVENTORY',
  'BUY_ARTIST_BOOKINGS',
  'BUY_AD_INVENTORY',
  'COMMISSION_CREATOR_JOBS',
] as const satisfies readonly Capability[];
export type BusinessCapability = (typeof BUSINESS_CAPABILITY)[number];

export const PRESET = ['PATRON', 'ARTIST', 'CREATOR', 'VENUE', 'ORGANISER', 'BRAND', 'CUSTOM'] as const;
export type Preset = (typeof PRESET)[number];

export const SELLER_TYPE = ['INDIVIDUAL', 'BUSINESS'] as const;
export type SellerType = (typeof SELLER_TYPE)[number];

export const ARTIST_CATEGORY = [
  'DJ',
  'MC_HOST',
  'EVENT_HOST',
  'MUSICIAN_BAND',
  'COMEDIAN',
  'PHOTOGRAPHER',
  'DANCER',
  'OTHER',
] as const;
export type ArtistCategory = (typeof ARTIST_CATEGORY)[number];

export const VERIFICATION_TIER = ['PHONE_VERIFIED', 'ID_VERIFIED', 'VERIFIED_ARTIST'] as const;
export type VerificationTier = (typeof VERIFICATION_TIER)[number];

export const CONTENT_TYPE = ['PAID_MIX', 'SET', 'MERCH', 'OTHER'] as const;
export type ContentType = (typeof CONTENT_TYPE)[number];

export const AVAILABILITY_STATUS = ['AVAILABLE', 'BOOKED', 'BLOCKED', 'TENTATIVE'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[number];

export const BOOKING_REQUEST_STATUS = ['PENDING', 'ACCEPTED', 'DECLINED', 'NEGOTIATING', 'EXPIRED', 'CANCELLED'] as const;
export type BookingRequestStatus = (typeof BOOKING_REQUEST_STATUS)[number];

// Not in the spec's constants list but required by the 7.1 state machine.
export const BOOKING_STATUS = ['AWAITING_SIGNATURES', 'CONTRACT_SIGNED', 'SCHEDULED', 'COMPLETED', 'PAID', 'DISPUTED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const PROPOSAL_STATUS = [
  'SENT',
  'VIEWED',
  'SUBMITTED',
  'SHORTLISTED',
  'ACCEPTED',
  'DECLINED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS)[number];
// The spec's single enum covers two different flows; each flow only uses its subset.
export type ArtistPitchStatus = Extract<ProposalStatus, 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'>;
export type CreatorProposalStatus = Extract<ProposalStatus, 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED'>;

export const INVENTORY_TYPE = ['TABLE', 'DRINK_PREORDER', 'TICKET', 'AD_SLOT'] as const;
export type InventoryType = (typeof INVENTORY_TYPE)[number];

export const VENUE_TYPE = ['CLUB', 'BAR', 'LOUNGE', 'EVENT_SPACE', 'OTHER'] as const;
export type VenueType = (typeof VENUE_TYPE)[number];

// Spec also lists TABLE here; tables are their own inventory type, so it is omitted.
export const TICKET_TIER = ['EARLY_BIRD', 'REGULAR', 'VIP'] as const;
export type TicketTier = (typeof TICKET_TIER)[number];

export const EVENT_STATUS = ['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED'] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const AD_SLOT_STATUS = ['AVAILABLE', 'BOOKED', 'EXPIRED'] as const;
export type AdSlotStatus = (typeof AD_SLOT_STATUS)[number];

export const PAYMENT_METHOD = ['MPESA', 'CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const PAYOUT_METHOD = ['MPESA', 'BANK'] as const;
export type PayoutMethod = (typeof PAYOUT_METHOD)[number];

export const PAYOUT_SCHEDULE = ['ON_DEMAND', 'WEEKLY', 'MONTHLY'] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULE)[number];

export const TRANSACTION_STATUS = ['INITIATED', 'PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED', 'DISPUTED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const ESCROW_STATE = ['AWAITING_FUNDS', 'FUNDS_HELD', 'FULFILLED', 'RELEASED', 'REFUNDED', 'DISPUTED'] as const;
export type EscrowState = (typeof ESCROW_STATE)[number];

export const COMMISSION_TYPE = ['PLATFORM_FEE', 'VENUE_SHARE', 'ARTIST_SHARE', 'AD_BROKER_SHARE', 'REFERRAL_REWARD'] as const;
export type CommissionType = (typeof COMMISSION_TYPE)[number];

// AD_RUN_COMPLETED added: the spec's 6.3 ad-slot trigger has no enum value.
export const FULFILLMENT_TRIGGER = [
  'BOOKING_COMPLETED',
  'TICKET_SCANNED',
  'CONTENT_DELIVERED',
  'TABLE_REDEEMED',
  'JOB_CONFIRMED',
  'AD_RUN_COMPLETED',
] as const;
export type FulfillmentTrigger = (typeof FULFILLMENT_TRIGGER)[number];

export const EARN_PROGRAMME = ['REFERRAL', 'ARTIST_RECRUITMENT', 'BECOME_A_MODEL', 'LYRIC_CONTRIBUTION'] as const;
export type EarnProgramme = (typeof EARN_PROGRAMME)[number];

export const REWARD_STATUS = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const;
export type RewardStatus = (typeof REWARD_STATUS)[number];

export const LEAD_STATUS = ['SUBMITTED', 'CONTACTED', 'ONBOARDED', 'ACTIVATED', 'REJECTED'] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const CONTRACT_STATUS = ['DRAFT', 'SENT', 'SIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[number];

export const DISPUTE_STATUS = ['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'ESCALATED'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUS)[number];

export const FLAG_STATUS = ['OPEN', 'UPHELD', 'DISMISSED'] as const;
export type FlagStatus = (typeof FLAG_STATUS)[number];

export const CAMPAIGN_STATUS = ['DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'CANCELLED'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const JOB_STATUS = [
  'ASSIGNED',
  'DRAFT_SUBMITTED',
  'REVISION_REQUESTED',
  'APPROVED',
  'POSTED',
  'CONFIRMED',
  'PAID',
  'DISPUTED',
  'CANCELLED',
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const JOB_TYPE = ['INFLUENCE', 'INSIGHTS'] as const;
export type JobType = (typeof JOB_TYPE)[number];

// Happy path per job type (7.3). Guardrail 8: insights jobs skip the posting step.
export const JOB_FLOW = {
  INFLUENCE: ['ASSIGNED', 'DRAFT_SUBMITTED', 'APPROVED', 'POSTED', 'CONFIRMED', 'PAID'],
  INSIGHTS: ['ASSIGNED', 'DRAFT_SUBMITTED', 'APPROVED', 'CONFIRMED', 'PAID'],
} as const satisfies Record<JobType, readonly JobStatus[]>;

export const JOB_SOURCE = ['OPEN_PROPOSAL', 'DIRECT_INVITE'] as const;
export type JobSource = (typeof JOB_SOURCE)[number];

export const CREATOR_TIER = ['NANO', 'MICRO', 'MACRO', 'META', 'MEGA'] as const;
export type CreatorTier = (typeof CREATOR_TIER)[number];

// Added for 7.4 (order state machine), which has no enum in the spec.
export const ORDER_STATUS = ['PLACED', 'PAID', 'FULFILLED', 'COMPLETED', 'REFUNDED', 'DISPUTED'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const NOTIFICATION_CHANNEL = ['SMS', 'PUSH', 'EMAIL', 'IN_APP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const NOTIFICATION_EVENT = [
  'ACCOUNT_CREATED',
  'BOOKING_REQUESTED',
  'BOOKING_ACCEPTED',
  'PAYMENT_HELD',
  'PAYMENT_RELEASED',
  'TICKET_PURCHASED',
  'JOB_ASSIGNED',
  'DRAFT_SUBMITTED',
  'JOB_CONFIRMED',
  'VERIFICATION_PASSED',
  'REWARD_EARNED',
  'WALLET_TOPUP',
  'CONTENT_REPORTED',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENT)[number];

export const CURRENCY = 'KES' as const;
export const CURRENCY_MINOR_UNIT = 100;
