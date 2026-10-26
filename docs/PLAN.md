# Selah Prototype: Phased Plan & Checklist

Source spec: [instructions.md](instructions.md). This file is the single source of truth for build progress.
Tick items as they land. Don't start a phase until the previous phase's **Exit check** passes.

---

## Ground rules (apply to every phase)

- **Frontend only. Zero backend.** Everything is a facade. No real APIs, emails, SMS, payments, or KYC.
- **Real user flows, not fake personas.** A tester can register → get "check your email/phone for OTP" → verify → log in → do everything. Seeded people only populate the world (artists to book, venues to buy from, brands posting jobs).
- **Demo shortcuts are optional.** The login page offers "Continue as …" for seeded accounts and for Admin.
- **Other parties are simulated.** Anything that waits on someone else (verification, artist acceptance, payment, brand approval, scans) shows an animated processing/pending step, then resolves on its own.
- **The fake backend is one client store.** It's seeded from the mock world and saved in `localStorage`. It exposes plain actions (`register`, `placeOrder`, …). A "Reset prototype" control restores the seed.
- **Strict TypeScript.** Enums are `as const` tuples, labels are exhaustive `Record<Enum, …>`, IDs are template literals, and money is `Minor` (integer KES cents).
- **Dashboard = base panels + union(capability panels).** Never `if venue`.
- **Rates and thresholds come from versioned policy config.** No magic numbers in components.
- **Mock data is about coverage, not volume.** Use hero personas + factories + status galleries, and deterministic pickers (no `Math.random` in seed).

### Simulated counterparties (facade timings)
| Waiting on | Facade behaviour |
|---|---|
| OTP | Any 6 digits accepted; screen hints `123456`; "Resend" has a countdown |
| ID verification (IPRS/KYC) | ID number + selfie → animated steps (≈3s) → `ID_VERIFIED` |
| Business verification | Docs upload → "Under review" animation → verified badge |
| Social tier check | Handle → "Fetching followers…" → follower count + tier assigned |
| M-Pesa / card payment | STK push screen ("Check your phone") → processing → success |
| Artist responds to a booking | Pending → auto-accepts (or counters if the offer is below the artist's minimum) |
| Venue/brand responds to a pitch/proposal | `SENT` → `VIEWED` → `ACCEPTED` |
| Creator does the job (brand side) | Invite → accepted → draft auto-submitted for review |
| Brand reviews the job (creator side) | Draft → approved (first draft may get a revision request) → confirmed → paid |
| Fulfilment | "Simulate event night"/scan → escrow `FULFILLED` → hold → `RELEASED` |
| Earn programmes | Submission → pending → approved/paid after a short delay |

---

## Phase 0: Decisions ✅
- [x] Read spec, map data models, constants, journeys
- [x] Facade rules agreed (real flows, simulated counterparties, no backend)
- [x] Seeded world doubles as the Admin console's data
- [x] Spec gaps resolved: added `BOOKING_STATUS`, `ORDER_STATUS`, `AD_RUN_COMPLETED`; split `PROPOSAL_STATUS` into pitch/creator subsets; dropped `TICKET_TIER.TABLE`; label priority Venue > Organiser > Brand; creator-only artists allowed

## Phase 1: Foundation
**Constants & types**
- [x] `src/lib/constants/enums.ts`: all Part 8.1 enums (+ the additions above)
- [x] `src/types/index.ts`: all models, `World`, `Session`
- [x] `src/lib/constants/labels.ts`: exhaustive label + tone maps per enum
- [x] `src/lib/constants/panels.ts`: `BASE_PANELS`, `PANELS_BY_CAPABILITY`, panel meta (label, href, icon), `PRESET_CAPABILITIES`, `LABEL_PRIORITY`
- [x] `src/lib/constants/policy.ts`: versioned `PolicyVersion[]` + `currentPolicy()`

**Helpers & selectors**
- [x] `src/lib/format.ts`: `kes()`, `formatKES()`, dates, relative time, phone masking
- [x] `src/lib/selectors.ts`: `getPanels`, `displayLabel`, `canSell`, `partyName`, `byId`, scoped lists (orders/bookings/jobs for a party), `computeSplits`

**Mock world**
- [x] `src/lib/data/pools.ts`: Kenyan names, areas, genres, venues, brands, images
- [x] `src/lib/data/factories.ts`: `pick`, `times`, `dayOffset`, `make*` per model
- [x] `src/lib/data/seed.ts`: hero accounts (Admin, Wanjiku patron, DJ Kaz artist+creator, Amani creator, Brian artist+club owner, Alchemist Lounge venue, Kilele Drinks brand, Nairobi Nights organiser), directory filler, status galleries, escrows/transactions

**Fake backend store**
- [x] `src/lib/store/store.ts`: `useSyncExternalStore`, `localStorage` persistence, `commit(draft => …)`, reset
- [x] `src/lib/store/actions/*`: grouped actions (auth, wallet, orders, bookings, artist, creator, business, earn, admin)
- [x] `src/lib/store/simulate.ts`: scheduled counterparty responses (timers that call actions)
- [x] `useSession()`, `useWorld()`, `useActingAs()` hooks

**UI kit (`src/components/ui`)**
- [x] Theme tokens in `globals.css` (brand colours, light/dark)
- [x] Button, LinkButton, Input, Textarea, Select, Checkbox, Radio cards, Toggle
- [x] Card, Badge/StatusPill (driven by tone maps), Avatar, Money, EmptyState, Skeleton
- [x] Tabs, Modal/Sheet, Toast, Stepper (wizard progress)
- [x] **ProcessingSteps**: the shared animated "waiting → done" component
- [x] OtpInput, FileDrop (fake upload), QrCode (decorative), Timeline (state machine visual)

**Layout (`src/components/layout`)**
- [x] Root `<Suspense>` + hydration gate (splash until store loads)
- [x] AuthLayout (centered card)
- [x] AppShell: sidebar (desktop) / bottom nav (mobile) from `getPanels`
- [x] Account switcher ("Acting as"), notification bell, user menu, logout
- [x] Prototype bar: reset world, current account, link to admin

**Exit check:** `tsc` + lint clean; store persists across reloads; reset works.

## Phase 2: Auth & entry
- [x] Landing page (`/`): value prop, Sign up / Log in
- [x] Register (`/register`): name, phone (+254) or email toggle, location, terms
- [x] OTP sent (`/register/verify`): "We've sent a code to …", OTP input, resend countdown, change number
- [x] Creating account (processing animation) → Welcome (`/welcome`) with next-steps cards
- [x] Login (`/login`): phone/email → OTP → home
- [x] Demo shortcuts on login: "Continue as …" (seeded accounts + Admin)
- [x] Route guards: app routes need a session; auth routes redirect if logged in; admin routes need `isAdmin`
- [x] Logout
- [x] Duplicate account handling ("An account with this number exists, log in instead")

**Exit check:** a new tester can register, log out, and log back in to the same account.

## Phase 3: Universal / Patron (every person)
- [x] Home: greeting, wallet snapshot, upcoming orders, recommended events/artists, selling prompt
- [x] Discover: tabs Events / Artists / Venues, search + filters
- [x] Event detail: lineup, venue, tickets/tables/drinks, "Buy"
- [x] Checkout: pick items → payment method (M-Pesa / Card / Wallet) → STK push animation → success
- [x] Orders list + Order detail (QR, status timeline, escrow state, receipt, request refund)
- [x] Wallet: balance, top-up (M-Pesa/card animation), transaction history, filters
- [x] Venue profile (public)
- [x] Artist profile (public): bio, media, pricing, content store, "Book", "Buy mix"
- [x] Book an artist as a patron: request form → sent → simulated accept/counter → contract e-sign → escrow pay → scheduled
- [x] My bookings (buyer side) list + detail
- [x] Buy paid content → delivered → library/download screen
- [x] Notifications page (+ bell dropdown)
- [x] Settings: profile, security (PIN/biometric toggles, sessions/devices), notification prefs, language, privacy, payout accounts
- [x] Disputes: raise from order/booking → dispute detail timeline (simulated review)
- [x] Earn with Selah: overview + Referral (link/share, invitees) + Recruit an artist (lead form, pipeline) + Become a Model (application) + Lyric contribution (submit) + rewards history
- [x] Selling prompt: "Want to sell? Add a role" → role chooser (Artist / Business Account)

**Exit check:** a fresh patron can top up, buy a ticket, see the QR, book an artist, and earn a referral reward.

## Phase 4: Artist (`SELL_ARTIST_SERVICES`)
- [x] Add Artist role wizard: seller type → (business details) → category → profile & media → pricing → payout setup → ID verification (ID + selfie, animated) → optional creator services → live in directory
- [x] Artist dashboard: today, pending requests, earnings snapshot, verification tier progress
- [x] Pricing panel: booking rate (fixed/range), song request, shout-out
- [x] Gigs inbox: incoming requests (from patrons & venues) → accept / decline / counter → contract e-sign
- [x] Bookings list + detail (status timeline, escrow, contract, mark completed → release)
- [x] Calendar: month view with AVAILABLE/BOOKED/BLOCKED/TENTATIVE, block dates
- [x] Proposals: pitch a venue/event → `SENT`→`VIEWED`→ outcome (simulated)
- [x] Store & My Content: upload mix/set/merch (fake upload), set price, sales list
- [x] Promo: create paid promo campaign (spend from wallet), results
- [x] Live requests & tips: static "session mode" preview (QR + incoming requests mock), marked as scoped separately
- [x] Earnings & Analytics: held vs released, payout history, request payout (min threshold), views/bookings/revenue, top requesters; CSV statement
- [x] Verified Artist badge progression

**Exit check:** a new user becomes an artist, receives a booking, signs, completes, and is paid out.

## Phase 5: Creator (`SELL_CREATOR_SERVICES`)
- [x] Enable creator services (from wizard or later): niche, rate card, link socials → tier fetch animation (`/onboarding/creator`; creator-only sellers also do payout + ID there)
- [x] Creator profile panel: tier badge, follower count, last verified, recheck
- [x] Job inbox: direct invites (accept/decline) + open campaigns browse
- [x] Submit proposal to an open campaign → `SUBMITTED`→`SHORTLISTED`→`ACCEPTED` (simulated)
- [x] Active job (INFLUENCE): accept → e-sign agreement → submit draft → revision requested → resubmit → approved → schedule/post → mark posted (link/screenshot) → confirmed → paid
- [x] Active job (INSIGHTS): survey/insights form → approved → confirmed → paid (no posting step)
- [x] Creator earnings: per-job escrow, confirmation status, payouts; CSV statement

**Exit check:** a creator completes both an influence job and an insights job end to end.

## Phase 6: Business Account
**Onboarding & composition**
- [x] Add Business Account wizard: details → preset grid → customise capabilities → verification (stricter if sell-side) / billing (buy-only) → live (`/onboarding/business`; sell-side = docs review + payout, buy-side = billing; label previewed live)
- [x] Account switcher: switch between personal and each business
- [x] Business dashboard composed from capabilities (base + union), derived label shown (one section per capability, readiness banner per Guardrail 3; `/biz/*` screens gated by `capabilityForPath`)
- [x] Business settings: details, capabilities toggle (add/remove → panels update), team contact, payout/billing, business verification

**`SELL_VENUE_INVENTORY`**
- [x] Inventory: tables, drink pre-orders, tickets, ad slots (create/edit forms, `PayoutPreview` on price)
- [x] Events: create (`DRAFT`) → attach tickets/tables → publish → sold out/completed/cancelled (publish needs ≥1 tier + ready business; cancel refunds paid orders; lineup editor)
- [x] Orders & Check-in: orders list, table assignment, QR scan screen (simulated scan or typed code → redeemed → escrow released)
- [x] Ad-slot management: screens, availability, pricing, bookings received
- [x] Payouts & Reports: sales, booking costs, ad revenue share, payout history; CSV export of statement and sales by event

**`BUY_ARTIST_BOOKINGS`**
- [x] Artist directory (filters: category, genre, price, location, verified)
- [x] Booking requests & received proposals (pitches from artists), negotiate (accepting a pitch sends a booking request at the pitched fee)
- [x] Contracts list + e-sign (bookings and creator jobs)
- [x] Booking payments: pay escrow → release on completion (shared `BuyerBookingView`)

**`BUY_AD_INVENTORY`**
- [x] Ad marketplace: venue slots with reach estimates
- [x] Campaign builder: slots, dates, budget → creative upload → pay (wallet/M-Pesa/card, or invoice for `INVOICED` billing); one escrow per venue with `AD_BROKER_SHARE`; verified business needed above `adSpendVerifyThreshold`
- [x] Campaign tracking: impressions/plays/spend (simulated run → completed → venues paid)
- [x] Billing: invoices list/download (fake), prepaid wallet

**`COMMISSION_CREATOR_JOBS`**
- [x] Creator campaign builder: type, tiers, budget, fee, deadline, deliverables → `DRAFT`→`OPEN` (opening attracts simulated proposals)
- [x] Creator directory: filter by tier/niche → direct invite (fee into escrow; simulated creator accepts, signs, submits)
- [x] Proposals review: shortlist / accept / reject
- [x] Job approval: review draft → request revision / approve → confirm posted → release escrow (simulated creator resubmits and posts; never simulates the tester)
- [x] Campaign analytics: reach, submissions, spend, completion; per-creator CSV report

**Exit check:** one person creates a club with all four capabilities and sees every panel without conflicts. ✅ Passed in a scripted browser run (2026-10-23): 19 panels, no duplicates, no errors; turning a capability off removes its panels and gates its screens.

## Phase 7: Money spine surfaces (shared)
- [x] EscrowTimeline component (`AWAITING_FUNDS`→…→`RELEASED`/`REFUNDED`/`DISPUTED`) used on orders, bookings, jobs, ad campaigns
- [x] Split breakdown (platform fee, venue/artist share, broker share) from current policy version: `SplitBreakdown` (per-line %, recipient, policy version + effective date; escrows keep the version they opened under) and `PayoutPreview` ("You receive X after the Y% fee", via `quoteSplits`). Wired into artist pricing/store/gig response and creator proposal/invite. Phase 6 ad-slot pricing should pass `feeType="AD_BROKER_SHARE"`, and venue inventory/payout screens should reuse both.
- [x] Payout request flow: method, min threshold check, schedule, processing → paid
- [x] Refund path: dispute resolved for buyer → escrow refunded → wallet credited
- [x] Contract viewer + e-sign (shared by bookings & creator jobs)

## Phase 8: Admin console (seeded world view)
Built in `src/app/admin/*` (own `AdminShell` + `admin/layout.tsx` guard), selectors in `src/lib/admin.ts`, actions in `src/lib/store/actions/admin.ts`.
- [x] Admin login (demo shortcut) + admin layout (sidebar with live queue counts, "Browse the app as Selah Ops")
- [x] Overview: GMV, escrow held, payouts due, net revenue (fees − rewards), active users by role, needs-attention queues, recent activity
- [x] People & Businesses: searchable tables, one detail route (`/admin/people/[id]`, per_/biz_), capabilities, derived labels, transactions
- [x] Verification queue: ID manual review (sellers who didn't clear the automated check), business docs (strict vs light), Verified Artist badge (`BADGE_GIGS` now shared), recent results; approve / reject → resubmission notice
- [x] Ledger: escrows (state chips + split modal), transactions (status chips), split totals by commission type × policy version, payouts; CSV export of the open tab with its filters
- [x] Revenue reports (`/admin/reports`): weekly/monthly GMV, platform revenue, Earn rewards paid, net revenue, refunds, payouts, new accounts; totals and take rate per revenue stream; Earn rewards by programme (paid / approved-unpaid / in review); CSV export
- [x] Payouts queue (`/admin/payouts`): withdrawals over policy `payoutReviewAbove` wait as PENDING (reserved from the wallet) → approve (one / all) or reject with note (returned to wallet); scheduled run for weekly/monthly sellers over the minimum, with per-seller opt-out; history. Sellers see "In review" / "Returned"
- [x] Platform balances (`/admin/balances`): user funds (wallets, escrow by state, payouts in transit) vs Selah's own (fees − rewards paid) = expected bank balance; fees on held escrow and approved-unpaid rewards as "coming up"; largest wallets; CSV export
- [x] Disputes: active/closed list → detail → start review / resolve buyer (refund) / resolve seller (release) / escalate, with note to both parties
- [x] Reported content (`/admin/flags`): open/closed queue of flagged profiles, events and store items, repeat-report badge; uphold (warns owner) / dismiss, with note. Users report from artist, venue and event pages and store items (`ReportButton`)
- [x] Policy config: version history with changed-value highlights, in force / scheduled / superseded, "new version" editor (seller shares derived from platform fee)
- [x] Earn moderation: per programme, approve & pay / reject, recruitment lead pipeline select
- [x] Creator tiers: recheck queue (stale per `tierRecheckDays`), recheck one / all due
- [x] Notifications log: all notifications, filter by event/channel, fan-out channels from recipient prefs (simulated)
- [x] State galleries: one example per status for 17 state machines, with coverage counts
- [ ] Browser walk of journey 23 (built; `tsc`, eslint, `next build` clean)

## Phase 9: Polish & QA
- [ ] Empty, loading, and error states on every list/detail
- [ ] Mobile layout pass (bottom nav, sheets) + desktop pass
- [ ] Copy pass (Kenyan context: KES, M-Pesa, +254)
- [ ] `tsc --noEmit`, `eslint`, `next build` all clean
- [ ] Walk every journey in the checklist below on a fresh reset
- [ ] Tester README: how to start, OTP hint, reset, demo accounts
- [x] Design tokens from `public/ui.webp` (shadows, radii, type roles, icon stroke); rules in `docs/DESIGN.md`
- [x] Shared primitives + shells + Wallet moved to tokens (no borders, pill controls, tinted `Card tone`)
- [x] Page sweep to DESIGN.md: borders → shadows/fills, divided lists → spaced rows, headings → type roles, radii → card/tile/full (landing page left as marketing)
- [x] Content colour: event/venue photo covers, `Orb` per item, `PayMark` payment brand colours, `IconCircle` on activity rows
- [x] Fonts: Montserrat (h1–h3) + Nunito (body), replacing Poppins

---

## Journey checklist (final QA)
| # | Journey | Phase | ✓ |
|---|---|---|---|
| 1 | Register → OTP → welcome → home | 2 | [x] |
| 2 | Log out → log in → same data | 2 | [x] |
| 3 | Top up wallet (M-Pesa) | 3 | [x] |
| 4 | Buy ticket/table → QR → venue scans → escrow released | 3/6 | [x] |
| 5 | Patron books artist → accept/counter → contract → pay → completed | 3 | [x] |
| 6 | Buy paid mix → delivered | 3 | [x] |
| 7 | Earn: referral, recruit artist, model, lyric | 3 | [x] |
| 8 | Raise dispute → resolved → refund | 3/7 | [x] |
| 9 | Add Artist role → ID verified → live | 4 | [x] |
| 10 | Artist receives request → accept → contract → complete → payout | 4 | [x] |
| 11 | Artist pitches venue | 4 | [x] |
| 12 | Artist uploads mix / runs promo | 4 | [x] |
| 13 | Enable creator → socials → tier | 5 | [~] built; needs a browser walk |
| 14 | Creator invite → influence job → paid | 5 | [~] built; needs a browser walk |
| 15 | Creator open-campaign proposal → accepted | 5 | [~] built; needs a browser walk |
| 16 | Insights job → paid | 5 | [~] built; needs a browser walk |
| 17 | Add Business Account (preset/custom) → verified | 6 | [x] |
| 18 | Venue: inventory → event → publish → orders → check-in → payouts | 6 | [x] |
| 19 | Venue/organiser books artist | 6 | [x] |
| 20 | Brand: ad campaign → creative → pay → impressions | 6 | [x] |
| 21 | Brand: creator campaign → proposals/invites → approve → release | 6 | [x] |
| 22 | Switch acting-as between personal & business accounts | 6 | [x] |
| 23 | Admin: overview, verify, resolve dispute, edit policy | 8 | [~] built; needs a browser walk |
| 24 | Reset prototype | 1 | [x] |
