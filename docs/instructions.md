
## PART 0 — FOUNDATIONAL PRINCIPLES

1. **One Person at the root.** Every account is a Person. Everyone can buy. Selling requires adding a capability.
2. **Buying is universal; selling is gated.** No role is needed to buy. Verification and payout setup are required to sell.
3. **One Business Account object.** "Venue," "Brand," "Organiser" are *derived display labels* from capability flags — never separate tables.
4. **Creators are Artists.** Influencers/UGC creators are Artists with `SELL_CREATOR_SERVICES`; no separate role.
5. **Structure lives in enums; policy lives in config.** Commission rates, thresholds, and reward amounts are admin-editable, versioned by effective date — never hardcoded.
6. **Money is integer minor units.** No floats. Single currency v1: KES (stored as a constant regardless).
7. **Bayes Consulting is the money spine.** Escrow → split → payout, for every sell-side flow (bookings, tickets/tables, content, creator jobs, ad slots).
8. **Earn-with-Selah pays commissions/rewards, never listed products.** Available to everyone; it is not a storefront.

---

## PART 1 — THE ROLE MODEL

### 1.1 Root object: Person
Every human account. Created at signup. Holds identity, wallet, orders, and zero-or-more capabilities.

### 1.2 Role types
| Role | Type | How obtained | Sells? |
|---|---|---|---|
| **Patron** | Base (default) | Automatic at signup | No (earns rewards only) |
| **Artist** | Selling role | "Add Artist role" | Yes (artist services + optionally creator services) |
| **Business Account** | Selling/buying account | "Add Business Account" | Depends on capabilities |

### 1.3 Capabilities (the real switches)
| Capability | Attaches to | Meaning |
|---|---|---|
| `SELL_ARTIST_SERVICES` | Artist | Set rates, take bookings, sell content/merch, live requests/tips |
| `SELL_CREATOR_SERVICES` | Artist | Accept creator jobs, submit drafts, get paid |
| `SELL_VENUE_INVENTORY` | Business Account | Sell tables, drink pre-orders, tickets, ad slots |
| `BUY_ARTIST_BOOKINGS` | Business Account | Book artists, send requests, sign contracts, pay escrow |
| `BUY_AD_INVENTORY` | Business Account | Buy ad slots on venue screens/broadcasts |
| `COMMISSION_CREATOR_JOBS` | Business Account | Create campaigns, receive proposals/invites, approve work, release payment |

*(Base buying is implicit for everyone and not a flag.)*

### 1.4 Presets → capability map
| Preset | Display label | Capabilities |
|---|---|---|
| Patron | Patron | Base buying only |
| Artist | Artist | Base + `SELL_ARTIST_SERVICES` |
| Creator | Creator (label on Artist) | Base + `SELL_CREATOR_SERVICES` |
| Venue | Venue | Base + `SELL_VENUE_INVENTORY` + `BUY_ARTIST_BOOKINGS` |
| Organiser | Organiser | Base + `BUY_ARTIST_BOOKINGS` (+ `SELL_VENUE_INVENTORY` if selling tickets) |
| Brand | Brand | Base + `BUY_AD_INVENTORY` (+ `COMMISSION_CREATOR_JOBS` if running creator campaigns) |
| Custom | — | Any combination |

**Display label derivation:** highest-order capability wins for labeling (e.g., a club with inventory + bookings shows "Venue"; a club also buying ads still shows "Venue" but has the ad panels too). Presets are onboarding shortcuts stored as flag combos, never as types.

---

## PART 2 — UNIVERSAL FUNCTIONALITIES (every Person)

Available to Patron, Artist, and Business Account alike.

### 2.1 Identity & account
- Signup via phone/email + OTP (phone-first for M-Pesa alignment).
- Base profile: name, photo, location, phone, email.
- Wallet: balance, top-up (M-Pesa/card), transaction history.
- Security: PIN/biometric, session management, device list.
- Settings: notifications, language, privacy, payout accounts (if earning).

### 2.2 Buying
- Discover artists, venues, events, creator campaigns (if a creator).
- **Buy:** venue tables, drink pre-orders, tickets; artist song requests, tips, paid mixes/content, merch; ad slots (if business).
- **Book** an artist directly (private parties etc.) — Patron can book without a Business Account.
- Orders & receipts; refund/dispute initiation.
- QR check-in/redemption for tickets and tables.

### 2.3 Earn with Bayes (rewards — universal, not a storefront)
| Programme | Flow | Payout |
|---|---|---|
| **Referral** | Share link → signup tracked → reward on activation | Commission to wallet |
| **Artist recruitment** | Submit lead → `SUBMITTED`→`CONTACTED`→`ONBOARDED`→`ACTIVATED` → reward | Commission |
| **Become a Model** | Apply → review → approved → rewards programme | Commission |
| **Lyric contribution** | Submit → review → accepted → reward | Reward |

Reward amounts are config, versioned. Statuses: `PENDING`, `APPROVED`, `PAID`, `REJECTED`.

### 2.4 Selling prompt
- Non-sellers see "Want to sell? Add a role →" → Artist or Business Account.
- Sellers see "Run a business? Add Business Account →" where relevant.

---

## PART 3 — PATRON (pure buyer)

**Onboarding:** automatic at signup. Zero friction. No verification beyond phone.

**Functionality:** everything in Part 2 (identity, buying, earn-with-Selah, selling prompt). Lists nothing. Cannot receive payouts except Earn-with-Selah commissions.

**Upgrade path:** add Artist or Business Account role at any time.

---

## PART 4 — ARTIST (selling role)

### 4.1 Onboarding
1. From Person → "Add Artist role."
2. **Seller type:** Individual | Business (collective/band-as-entity/agency). Business → business name, reg/tax ID, payout account, contact.
3. **Category:** `DJ`, `MC_HOST`, `EVENT_HOST`, `MUSICIAN_BAND`, `COMEDIAN`, `PHOTOGRAPHER`, `DANCER`, `OTHER` (one shared artist section).
4. **Profile:** bio, genres/services, media (mixes, photos, reels), location + travel radius, languages.
5. **Pricing:** booking rate, song-request price, shout-out price (set/range).
6. **Payout setup:** M-Pesa/bank, verify.
7. **Verification tiers:** `PHONE_VERIFIED` → `ID_VERIFIED` (via IPRS/KYC provider — realistic and commercially available) → `VERIFIED_ARTIST` badge. Badge unlocks higher-value bookings and faster payouts.
8. Optional: `SELL_CREATOR_SERVICES` → creator profile (niche, rate card, social accounts linked, tier verified via social API).
9. Goes live in artist directory.

### 4.2 Functionality — `SELL_ARTIST_SERVICES`
| Panel | Capabilities |
|---|---|
| **Pricing** | Edit booking rates, song-request & shout-out prices |
| **Gigs / Proposals / Bookings / Contracts** | Receive booking requests (from venues *and* patrons); send proposals to venues/events; accept/decline/negotiate; in-app e-sign contracts; calendar & availability blocks (`AVAILABLE`/`BOOKED`/`BLOCKED`/`TENTATIVE`) |
| **Store & My Content** | Upload paid mixes/sets, set prices; merch inventory (`PAID_MIX`, `SET`, `MERCH`, `OTHER`) |
| **Promo** | Paid campaigns to promote songs/content (spends from wallet — artist as buyer) |
| **Live requests & tips** | Session mode (QR/link at venue), real-time requests + tips, live earnings — *flagged as a distinct real-time feature, scoped separately* |
| **Earnings & Analytics** | Escrow-held vs released funds, payout history, views/bookings/revenue, top requesters |

### 4.3 Functionality — `SELL_CREATOR_SERVICES`
| Panel | Capabilities |
|---|---|
| **Creator profile** | Niche, rate card, linked socials, **verified tier** (`NANO` 250–5K, `MICRO` 5K–30K, `MACRO` 30K–100K, `META` 100K–500K, `MEGA` 500K+), follower count + `tier_last_verified_at` |
| **Job inbox** | Direct invites (accept/decline); open campaigns to submit proposals to |
| **Active jobs** | Submit draft → handle revision requests → post at scheduled time → mark posted (link/screenshot) → await confirmation |
| **Insights jobs** | Submit survey/insights (no posting step) |
| **Earnings** | Per-job escrow, confirmation status, payout history |

---

## PART 5 — BUSINESS ACCOUNT

One object. Capabilities toggle panels. "Venue"/"Brand"/"Organiser" are derived labels.

### 5.1 Onboarding (single flow)
1. "Add Business Account."
2. Business details: name, reg/tax ID, physical address, payout account, billing account, contact/manager.
3. **Choose capabilities** (presets offered as shortcuts, "customise" underneath):
   - ☐ Sell venue inventory
   - ☐ Buy artist bookings
   - ☐ Buy ad inventory
   - ☐ Commission creator jobs
4. **Verification:** business + address docs → verified badge. *Higher bar if any sell-side capability is on* (handles money). Buy-side only needs billing set (verification above spend threshold).
5. Go live with enabled capabilities.

### 5.2 Functionality — `SELL_VENUE_INVENTORY`
| Panel | Capabilities |
|---|---|
| **Inventory** | Tables (capacity/price/perks), drinks (**pre-order/bottle service only — not full POS in v1**), tickets (tiers/capacity), ad slots (`TABLE`/`DRINK_PREORDER`/`TICKET`/`AD_SLOT`) |
| **Events** | Create event, attach tickets/tables, promote (`DRAFT`→`PUBLISHED`→`SOLD_OUT`/`CANCELLED`/`COMPLETED`) |
| **Orders & Check-in** | Patron purchases, table assignment, QR redemption |
| **Ad-slot management** | Expose screen/broadcast inventory, set availability & price (platform brokers to brands) |
| **Payouts & Reports** | Sales, booking costs, ad revenue share, payout history |

### 5.3 Functionality — `BUY_ARTIST_BOOKINGS`
| Panel | Capabilities |
|---|---|
| **Artist Directory** | Browse/filter artists, view profiles & pricing |
| **Bookings / Proposals** | Send booking requests, receive proposals, negotiate |
| **Contracts** | E-sign booking contracts |
| **Booking payments** | Pay via escrow; release on fulfillment |

### 5.4 Functionality — `BUY_AD_INVENTORY`
| Panel | Capabilities |
|---|---|
| **Ad Marketplace** | Browse venue screen/broadcast slots with reach estimates |
| **Campaigns** | Select slots, dates, budget; track impressions/plays/spend |
| **Creative** | Upload image/video assets |
| **Billing** | Prepaid wallet or invoiced; invoices/downloads |

### 5.5 Functionality — `COMMISSION_CREATOR_JOBS`
| Panel | Capabilities |
|---|---|
| **Campaigns** | Create brief (`JOB_TYPE`: `INFLUENCE`/`INSIGHTS`; tier; budget; deadline; deliverables); `DRAFT`→`OPEN`→`CLOSED`/`FILLED`/`CANCELLED` |
| **Creator Directory** | Filter by tier/niche; send **direct invites** |
| **Proposals** | Review open-campaign proposals (`SUBMITTED`→`SHORTLISTED`→`ACCEPTED`/`REJECTED`) |
| **Job approval** | Review drafts, request revisions, approve, confirm posted work → release escrow |
| **Campaign analytics** | Reach, submissions, spend, completion |

**Two entry paths, one object:** `source: OPEN_PROPOSAL | DIRECT_INVITE`.

### 5.6 Dashboard composition
`Dashboard = base panels + union(panels from every enabled capability)`. No special-casing.

| Account | Capabilities | Sees |
|---|---|---|
| Club | Sell inventory + Buy bookings | Inventory, Events, Check-in, Ad-slots, Payouts, Artist Directory, Bookings, Contracts |
| Brand | Buy ads | Ad Marketplace, Campaigns, Creative, Billing |
| Brand running campaigns | Buy ads + Commission jobs | + Campaigns, Creator Directory, Proposals, Job approval |
| Club running campaigns | All four | Everything — additive, no conflict |

---

## PART 6 — THE MONEY SPINE (Bayes Consulting)

### 6.1 Transaction lifecycle
`INITIATED` → `PENDING` → `HELD` (escrow) → `RELEASED` → (or `REFUNDED` / `FAILED` / `DISPUTED`)

### 6.2 Escrow states
`AWAITING_FUNDS` → `FUNDS_HELD` → `FULFILLED` → `RELEASED` (or `REFUNDED` / `DISPUTED`)

### 6.3 Fulfillment triggers by flow
| Flow | Trigger for release |
|---|---|
| Artist booking | `BOOKING_COMPLETED` |
| Ticket/table | `TICKET_SCANNED` / `TABLE_REDEEMED` |
| Paid content/mix | `CONTENT_DELIVERED` |
| Creator job (influence) | Brand `CONFIRMS` posted work |
| Creator job (insights) | Brand confirms insights submitted |
| Ad slot | Slot run completed / impressions delivered |

### 6.4 Split engine
`COMMISSION_TYPE`: `PLATFORM_FEE`, `VENUE_SHARE`, `ARTIST_SHARE`, `AD_BROKER_SHARE`, `REFERRAL_REWARD`. Rates in **config, versioned by effective date**, auditable for reconciliation.

### 6.5 Payouts
`PAYOUT_METHOD`: `MPESA`, `BANK`. `PAYOUT_SCHEDULE`: `ON_DEMAND`, `WEEKLY`, `MONTHLY`. `MIN_PAYOUT_THRESHOLD` config. Escrow hold period config (e.g., 24–72h post-fulfillment).

### 6.6 Disputes
`DISPUTE_STATUS`: `OPEN`→`UNDER_REVIEW`→`RESOLVED_BUYER`/`RESOLVED_SELLER`/`ESCALATED`. Refund path returns escrow to buyer.

### 6.7 Contracts
`CONTRACT_STATUS`: `DRAFT`→`SENT`→`SIGNED`→`ACTIVE`→`COMPLETED`/`CANCELLED`. In-app e-sign for bookings and creator jobs.

---

## PART 7 — STATE MACHINES (all flows)

### 7.1 Booking (artist ↔ venue/patron)
```
REQUESTED → ACCEPTED / DECLINED / NEGOTIATING / EXPIRED / CANCELLED
  → CONTRACT_SIGNED → SCHEDULED → COMPLETED → PAID
```
`BOOKING_REQUEST_STATUS`: `PENDING`, `ACCEPTED`, `DECLINED`, `NEGOTIATING`, `EXPIRED`, `CANCELLED`.

### 7.2 Proposal (artist pitches venue)
`SENT`→`VIEWED`→`ACCEPTED`/`DECLINED`/`WITHDRAWN`.

### 7.3 Creator job
```
Campaign OPEN → PROPOSAL SUBMITTED / DIRECT INVITE
  → ACCEPTED → JOB ASSIGNED
  → DRAFT_SUBMITTED → REVISION_REQUESTED (loop) → APPROVED
  → POSTED (influence only) → CONFIRMED → PAID
  (insights: ASSIGNED → DRAFT_SUBMITTED → APPROVED → CONFIRMED → PAID)
```
`JOB_STATUS`: `ASSIGNED`, `DRAFT_SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `POSTED`, `CONFIRMED`, `PAID`, `DISPUTED`, `CANCELLED`. **Post/approval steps conditional on `JOB_TYPE`.**

### 7.4 Order (ticket/table/drink/content)
`PLACED`→`PAID`(held)→`FULFILLED`(scanned/redeemed/delivered)→`COMPLETED` (→`REFUNDED`/`DISPUTED`).

---

## PART 8 — CONSTANTS (complete set)

### 8.1 Structure (enums — code-level)
- `ROLE_TYPE`: `PATRON`, `ARTIST`, `BUSINESS_ACCOUNT`
- `CAPABILITY`: `SELL_ARTIST_SERVICES`, `SELL_CREATOR_SERVICES`, `SELL_VENUE_INVENTORY`, `BUY_ARTIST_BOOKINGS`, `BUY_AD_INVENTORY`, `COMMISSION_CREATOR_JOBS`
- `PRESET`: `PATRON`, `ARTIST`, `CREATOR`, `VENUE`, `ORGANISER`, `BRAND`, `CUSTOM`
- `SELLER_TYPE`: `INDIVIDUAL`, `BUSINESS`
- `ARTIST_CATEGORY`: `DJ`, `MC_HOST`, `EVENT_HOST`, `MUSICIAN_BAND`, `COMEDIAN`, `PHOTOGRAPHER`, `DANCER`, `OTHER`
- `VERIFICATION_TIER`: `PHONE_VERIFIED`, `ID_VERIFIED`, `VERIFIED_ARTIST`
- `CONTENT_TYPE`: `PAID_MIX`, `SET`, `MERCH`, `OTHER`
- `AVAILABILITY_STATUS`: `AVAILABLE`, `BOOKED`, `BLOCKED`, `TENTATIVE`
- `BOOKING_REQUEST_STATUS`: `PENDING`, `ACCEPTED`, `DECLINED`, `NEGOTIATING`, `EXPIRED`, `CANCELLED`
- `PROPOSAL_STATUS`: `SENT`, `VIEWED`, `SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `DECLINED`, `REJECTED`, `WITHDRAWN`
- `INVENTORY_TYPE`: `TABLE`, `DRINK_PREORDER`, `TICKET`, `AD_SLOT`
- `VENUE_TYPE`: `CLUB`, `BAR`, `LOUNGE`, `EVENT_SPACE`, `OTHER`
- `TICKET_TIER`: `EARLY_BIRD`, `REGULAR`, `VIP`, `TABLE`
- `EVENT_STATUS`: `DRAFT`, `PUBLISHED`, `SOLD_OUT`, `CANCELLED`, `COMPLETED`
- `AD_SLOT_STATUS`: `AVAILABLE`, `BOOKED`, `EXPIRED`
- `PAYMENT_METHOD`: `MPESA`, `CARD`, `WALLET`
- `PAYOUT_METHOD`: `MPESA`, `BANK`
- `TRANSACTION_STATUS`: `INITIATED`, `PENDING`, `HELD`, `RELEASED`, `REFUNDED`, `FAILED`, `DISPUTED`
- `ESCROW_STATE`: `AWAITING_FUNDS`, `FUNDS_HELD`, `FULFILLED`, `RELEASED`, `REFUNDED`, `DISPUTED`
- `COMMISSION_TYPE`: `PLATFORM_FEE`, `VENUE_SHARE`, `ARTIST_SHARE`, `AD_BROKER_SHARE`, `REFERRAL_REWARD`
- `FULFILLMENT_TRIGGER`: `BOOKING_COMPLETED`, `TICKET_SCANNED`, `CONTENT_DELIVERED`, `TABLE_REDEEMED`, `JOB_CONFIRMED`
- `EARN_PROGRAMME`: `REFERRAL`, `ARTIST_RECRUITMENT`, `BECOME_A_MODEL`, `LYRIC_CONTRIBUTION`
- `REWARD_STATUS`: `PENDING`, `APPROVED`, `PAID`, `REJECTED`
- `LEAD_STATUS`: `SUBMITTED`, `CONTACTED`, `ONBOARDED`, `ACTIVATED`, `REJECTED`
- `CONTRACT_STATUS`: `DRAFT`, `SENT`, `SIGNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- `DISPUTE_STATUS`: `OPEN`, `UNDER_REVIEW`, `RESOLVED_BUYER`, `RESOLVED_SELLER`, `ESCALATED`
- `CAMPAIGN_STATUS`: `DRAFT`, `OPEN`, `CLOSED`, `FILLED`, `CANCELLED`
- `JOB_STATUS`: `ASSIGNED`, `DRAFT_SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `POSTED`, `CONFIRMED`, `PAID`, `DISPUTED`, `CANCELLED`
- `JOB_TYPE`: `INFLUENCE`, `INSIGHTS`
- `JOB_SOURCE`: `OPEN_PROPOSAL`, `DIRECT_INVITE`
- `CREATOR_TIER`: `NANO`, `MICRO`, `MACRO`, `META`, `MEGA`
- `NOTIFICATION_CHANNEL`: `SMS`, `PUSH`, `EMAIL`, `IN_APP`
- `NOTIFICATION_EVENT`: registry (`BOOKING_REQUESTED`, `BOOKING_ACCEPTED`, `PAYMENT_HELD`, `PAYMENT_RELEASED`, `TICKET_PURCHASED`, `JOB_ASSIGNED`, `DRAFT_SUBMITTED`, `JOB_CONFIRMED`, …)
- `CURRENCY`: `KES`; `CURRENCY_MINOR_UNIT`: `100` (hard)

### 8.2 Policy (config — admin-editable, versioned, effective-dated)
- `COMMISSION_RATE_*` (platform, venue split, artist split, ad-broker %, creator-job %)
- `ESCROW_HOLD_PERIOD`
- `REFERRAL_REWARD_AMOUNT`, creator-job reward settings
- `MIN_PAYOUT_THRESHOLD`
- `VERIFICATION_REQUIRED_ABOVE` (booking/spend value)
- `AD_SPEND_VERIFY_THRESHOLD`
- `BOOKING_REQUEST_EXPIRY`
- `MAX_ACTIVE_LIVE_SESSIONS`
- `TIER_THRESHOLDS` (250 / 5K / 30K / 100K / 500K)
- `TIER_RECHECK_INTERVAL`

---

## PART 9 — VERIFICATION REALITY (Kenya)

- **ID verification is real and commercial.** Kenya's IPRS (Integrated Population Registration System) supports remote ID checks; third-party KYC providers (e.g., Smile ID) offer API access to IPRS, e-citizen, and BRS, plus biometric selfie-vs-ID matching. M-Pesa onboarding already uses IPRS-based validation.
- **Implementation:** creator/artist/venue enters ID number + selfie → provider returns pass/fail via API. No manual document inspection required.
- **Cost:** per-check fee; legitimate operational cost.
- **Fallback:** low-tech users (no smartphone/good lighting) → in-person verification at partner location or manual review.
- **Creator tier:** verified via social API (follower count pulled, tier auto-assigned, periodic recheck via `TIER_RECHECK_INTERVAL`). Store `follower_count` + `tier_last_verified_at` for freshness.

---

## PART 10 — BUILD GUARDRAILS

1. **One `BusinessAccount` table + capability flags.** Never fork `Venue`/`Brand`/`Creator` tables.
2. **Dashboard = base + union(capabilities).** No hardcoded "if venue, show X."
3. **Sell-side ⇒ verification + payout required; buy-side ⇒ billing only.** Enforce in one place.
4. **Presets are flag combos**, stored as onboarding shortcuts — not types.
5. **Universal buying** — wallet/orders surface for every account; never conditioned on role.
6. **Money as integer minor units**; statuses/escrow as single shared state machine.
7. **Rates/thresholds in config, versioned by effective date** — never magic numbers.
8. **Job post/approval steps conditional on `JOB_TYPE`** — don't hardcode "post" into the shared job flow.
9. **Tiers are verified, not self-reported** — or they become noise.

