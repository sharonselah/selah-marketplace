'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, Gift, Lock, MapPin, ShieldCheck, Smartphone, Star, UserPlus, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { AudienceTabs } from '@/components/landing/AudienceTabs';
import { LandingNav } from '@/components/landing/LandingNav';
import { ARTISTS, CTA_IMAGE, EARN_IMAGE, EVENT_IMAGES, HERO_IMAGE, SERVICES, TESTIMONIALS, VENUES } from '@/components/landing/content';
import { useStore } from '@/lib/store/hooks';
import { formatDate } from '@/lib/format';
import { byId } from '@/lib/selectors';
import { cn } from '@/lib/cn';

const GLASS_BUTTON = 'inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 font-medium text-white backdrop-blur transition hover:bg-white/20';

export default function Landing() {
  const { session, world } = useStore();
  const events = world.events.filter((e) => e.status === 'PUBLISHED').slice(0, 6);
  const venueNames = world.businesses.filter((b) => b.venueType).map((b) => b.name);
  const start = session ? '/home' : '/register';

  return (
    <div className="flex flex-1 flex-col">
      <LandingNav signedIn={!!session} />

      {/* Hero */}
      <section className="relative isolate flex min-h-[min(92svh,56rem)] items-end overflow-hidden bg-black md:items-center">
        <Image src={HERO_IMAGE} alt="" fill preload sizes="100vw" className="-z-10 object-cover object-[65%_center] opacity-90" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/60 to-black/20 md:bg-linear-to-r md:from-black/90 md:via-black/55 md:to-transparent" />
        <div className="mx-auto w-full max-w-6xl px-4 pt-28 pb-14 md:px-8 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-5xl md:text-7xl">
              The night, <span className="text-violet-400">booked</span> and paid safely.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">Tickets, tables, DJs, artists and creators in one place. Every shilling is held in escrow until the job is done.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={start} size="lg" icon={<ArrowRight className="size-4" />}>
                {session ? 'Continue to Selah' : 'Create free account'}
              </LinkButton>
              <Link href="#events" className={GLASS_BUTTON}>
                Explore events
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><Smartphone className="size-4" /> M-Pesa ready</span>
              <span className="flex items-center gap-1.5"><Lock className="size-4" /> Escrow protected</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> Verified artists</span>
            </div>
          </div>
        </div>
      </section>

      {/* Venues on Selah */}
      {venueNames.length > 0 && (
        <section className="overflow-hidden border-b border-border bg-surface py-6">
          <p className="text-center text-sm text-muted">Venues already selling on Selah</p>
          <div className="relative mt-4 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] gap-12 pr-12">
              {[...venueNames, ...venueNames].map((n, i) => (
                <span key={i} className="text-lg font-semibold whitespace-nowrap text-muted/80">{n}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <Section id="services" title="Everything for a great night, in one app" subtitle="Whether you’re going out, performing or running the venue, Selah handles the booking and the money.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ title, body, image, href }) => (
            <Link key={title} href={href} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-card transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-text">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Events */}
      {events.length > 0 && (
        <Section id="events" title="Happening soon" subtitle="Grab your tickets before they sell out." tinted action={<LinkButton href="/discover" variant="outline">See all events</LinkButton>}>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {events.map((e, i) => (
              <Link key={e.id} href={`/events/${e.id}`} className="group relative aspect-[4/5] w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-black md:aspect-[4/3] md:w-auto">
                <Image src={EVENT_IMAGES[i % EVENT_IMAGES.length]} alt="" fill sizes="(max-width: 768px) 18rem, 33vw" className="object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute top-4 left-4 rounded-xl bg-white px-3 py-1.5 text-center leading-tight text-black shadow">
                  <div className="text-[10px] font-semibold tracking-wide uppercase">{formatDate(e.date, { month: 'short' })}</div>
                  <div className="text-lg font-bold">{formatDate(e.date, { day: 'numeric' })}</div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-xs text-white/70">{e.genres.slice(0, 2).join(' · ')}</div>
                  <div className="mt-1 text-xl font-semibold">{e.title}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-sm text-white/75">
                    <MapPin className="size-3.5" /> {byId(world.businesses, e.venueId)?.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Who are you */}
      <Section id="who" title="Who are you on Selah?" subtitle="One account. Buy anything, and add a selling role whenever you’re ready." center>
        <AudienceTabs />
      </Section>

      {/* How payment works */}
      <section id="how" className="scroll-mt-16 overflow-hidden bg-[#0d0b16] text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-8 md:py-28">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Your money is safe until the job is done</h2>
            <p className="mt-4 text-lg text-white/70">No more paying deposits and hoping for the best. Selah holds every payment and releases it only when the event, booking or job is delivered.</p>
            <ol className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
              {[
                { title: 'Pay', body: 'Pay with M-Pesa, card or your Selah wallet.' },
                { title: 'Held in escrow', body: 'Your money sits with Selah, not with the seller.' },
                { title: 'Released', body: 'Once you check in or the gig happens, the seller gets paid. Problem? Open a dispute and we step in.' },
              ].map(({ title, body }, i) => (
                <li key={title} className="flex gap-4 py-5">
                  <span className="w-6 shrink-0 text-xl font-bold text-violet-400">{i + 1}</span>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <p className="mt-0.5 text-white/65">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* Artists */}
      <Section id="artists" title="Book Kenya’s best DJs and artists" subtitle="Verified performers with clear rates, real reviews and payment protected by escrow." action={<LinkButton href="/discover" variant="outline">Browse all artists</LinkButton>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ARTISTS.map((a) => (
            <Link key={a.name} href="/discover" className="group">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                <Image src={a.image} alt={a.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />              </div>
              <div className="mt-3 flex items-center gap-1.5 font-semibold text-text">
                {a.name} <BadgeCheck className="size-4 text-brand" />
              </div>
              <div className="text-sm text-muted">{a.role} · {a.genres}</div>
              <div className="mt-1 text-sm text-text">
                <span className="font-medium">From KES {a.from.toLocaleString()}</span> <span className="text-muted">· {a.rating.toFixed(1)} ★</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Venues */}
      <Section title="Reserve your spot at the best venues" subtitle="From rooftop sundowners to beach parties, book tables and bottles ahead of time." tinted>
        <div className="grid gap-5 md:grid-cols-3">
          {VENUES.map((v) => (
            <div key={v.name} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative aspect-[4/3]">
                <Image src={v.image} alt={v.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1 text-xs font-medium text-muted"><MapPin className="size-3.5" /> {v.area}</div>
                <h3 className="mt-1 text-lg font-semibold text-text">{v.name}</h3>
                <p className="mt-1 text-sm text-muted">{v.body}</p>
                <Link href="/discover" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  Reserve a table <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section title="Loved by partygoers, artists and venues" center>
        <div className="mb-10 flex items-center justify-center gap-2 text-sm text-muted">
          <Stars rating={5} /> <span className="font-semibold text-text">4.9 out of 5</span> from early users
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-surface p-6">
              <Stars rating={t.rating} />
              <blockquote className="mt-4 flex-1 text-text">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-full">
                  <Image src={t.image} alt={t.name} fill sizes="48px" className="object-cover" />
                </div>
                <div>
                  <div className="font-semibold text-text">{t.name}</div>
                  <div className="text-sm text-muted">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* Earn */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
        <div className="grid overflow-hidden rounded-3xl bg-brand text-on-brand md:grid-cols-2">
          <div className="relative min-h-64 md:order-2">
            <Image src={EARN_IMAGE} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top" />
          </div>
          <div className="p-8 md:p-12">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Get rewarded for bringing people in</h2>
            <ul className="mt-6 flex flex-col gap-4">
              {[
                { icon: UserPlus, text: 'Refer friends and earn when they make their first purchase' },
                { icon: Gift, text: 'Recruit a DJ or MC and get a reward once they’re activated' },
                { icon: Wallet, text: 'Rewards go straight to your Selah wallet' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0" />
                  <span className="opacity-90">{text}</span>
                </li>
              ))}
            </ul>
            <Link href={session ? '/earn' : '/register'} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-brand transition hover:bg-white/90">
              Start earning <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative isolate overflow-hidden bg-black">
        <Image src={CTA_IMAGE} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-50" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/50 to-black/30" />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center md:py-32">
          <CalendarDays className="size-10 text-violet-400" />
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-6xl">Your night starts here</h2>
          <p className="mt-4 text-lg text-white/75">Join free in under a minute. All you need is your phone number.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={start} size="lg" icon={<ArrowRight className="size-4" />}>
              {session ? 'Continue to Selah' : 'Create free account'}
            </LinkButton>
            {!session && (
              <Link href="/login" className={GLASS_BUTTON}>
                Try a demo account
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Section({ id, title, subtitle, action, tinted, center, children }: { id?: string; title: string; subtitle?: string; action?: ReactNode; tinted?: boolean; center?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16', tinted && 'border-y border-border bg-surface-2/50')}>
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
        <div className={cn('mb-10 flex flex-col gap-4', center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between')}>
          <div className={cn(center && 'max-w-2xl')}>
            <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">{title}</h2>
            {subtitle && <p className="mt-3 max-w-2xl text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-4', n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-border text-border')} />
      ))}
    </div>
  );
}

/** M-Pesa STK prompt, drawn in code so it always matches the app. */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div className="absolute -inset-10 -z-0 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative rounded-[2.5rem] border-8 border-neutral-800 bg-neutral-900 p-3 shadow-2xl">
        <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-neutral-800" />
        <div className="rounded-2xl bg-white p-4 text-black">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Checkout</span>
            <span>Step 2 of 2</span>
          </div>
          <div className="mt-3">
            <div className="text-xs text-neutral-500">VIP table · Skyline Rooftop</div>
            <div className="mt-1 text-2xl font-bold">KES 12,500</div>
          </div>
          <div className="mt-4 rounded-xl border border-green-600/30 bg-green-50 p-3">
            <div className="text-xs font-semibold text-green-700">M-PESA</div>
            <div className="mt-1 text-sm">Do you want to pay KES 12,500 to SELAH ESCROW?</div>
            <div className="mt-3 flex gap-2">
              <span className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-medium text-neutral-500 shadow-sm">Cancel</span>
              <span className="flex-1 rounded-lg bg-green-600 py-2 text-center text-xs font-semibold text-white">Send</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-violet-800">
            <Lock className="size-4 shrink-0" /> Held safely until your event is done
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const cols: { title: string; links: [string, string][] }[] = [
    { title: 'Explore', links: [['Events', '/discover'], ['Artists', '/discover'], ['Venues', '/discover'], ['Earn with Selah', '/earn']] },
    { title: 'Sell on Selah', links: [['For artists', '/sell'], ['For creators', '/sell'], ['For venues', '/onboarding/business'], ['For brands', '/onboarding/business']] },
    { title: 'Company', links: [['Terms of Service', '/terms'], ['Privacy Policy', '/privacy'], ['Log in', '/login'], ['Sign up', '/register']] },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-5 md:px-8">
        <div className="md:col-span-2">
          <Logo href="/" />
          <p className="mt-3 max-w-xs text-sm text-muted">Kenya’s nightlife marketplace. Tickets, tables, artists and creators, paid safely through escrow.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-semibold text-text">{c.title}</div>
            <ul className="mt-3 flex flex-col gap-2">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted hover:text-text">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted md:px-8">© Selah · Interactive prototype: no real payments, messages or verification take place.</div>
      </div>
    </footer>
  );
}
