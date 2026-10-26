'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, User } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { IdVerificationStep, PayoutStep, payoutAccountFrom, type IdStage, type PayoutDraft } from '@/components/shared/SellerSteps';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Card, DefinitionList, PageHeader } from '@/components/ui/Display';
import { Field, Input, OptionCard, Select, Textarea, Toggle } from '@/components/ui/Field';
import { FileDrop, ProcessingSteps, Stepper } from '@/components/ui/Interactive';
import { ARTIST_CATEGORY, type ArtistCategory, type SellerType } from '@/lib/constants/enums';
import { ARTIST_CATEGORY_LABEL, PAYOUT_METHOD_LABEL } from '@/lib/constants/labels';
import { GENRES, LANGUAGES } from '@/lib/data/pools';
import { formatKES, formatPrice, kes } from '@/lib/format';
import { becomeArtist } from '@/lib/store/actions/artist';
import { useViewer } from '@/lib/store/hooks';
import type { PriceOrRange } from '@/types';

const STEPS = ['Seller type', 'Category', 'Profile', 'Pricing', 'Payout', 'ID verification', 'Creator services', 'Review'] as const;

export default function ArtistOnboarding() {
  const { me } = useViewer();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [sellerType, setSellerType] = useState<SellerType>('INDIVIDUAL');
  const [bizName, setBizName] = useState('');
  const [bizReg, setBizReg] = useState('');
  const [category, setCategory] = useState<ArtistCategory | null>(null);
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English', 'Swahili']);
  const [radius, setRadius] = useState('50');
  const [media, setMedia] = useState<string[]>([]);
  const [priceKind, setPriceKind] = useState<'FIXED' | 'RANGE'>('FIXED');
  const [rate, setRate] = useState('15000');
  const [rateMax, setRateMax] = useState('30000');
  const [songReq, setSongReq] = useState('200');
  const [shoutOut, setShoutOut] = useState('300');
  const [payout, setPayout] = useState<PayoutDraft>({ method: 'MPESA', account: me.phone, verified: false });
  const [idStage, setIdStage] = useState<IdStage>(me.verification !== 'PHONE_VERIFIED' ? 'done' : 'form');
  const [creator, setCreator] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const pricing: { booking: PriceOrRange; songRequest: ReturnType<typeof kes>; shoutOut: ReturnType<typeof kes> } = {
    booking: priceKind === 'FIXED' ? { kind: 'FIXED', amount: kes(Number(rate)) } : { kind: 'RANGE', min: kes(Number(rate)), max: kes(Number(rateMax)) },
    songRequest: kes(Number(songReq)),
    shoutOut: kes(Number(shoutOut)),
  };

  const validate = (): string | null => {
    switch (step) {
      case 0:
        return sellerType === 'BUSINESS' && (!bizName.trim() || !bizReg.trim()) ? 'Add your business name and registration number.' : null;
      case 1:
        return category ? null : 'Pick the category that best describes you.';
      case 2:
        if (!stageName.trim()) return 'Add your stage name.';
        if (bio.trim().length < 20) return 'Write a short bio (at least 20 characters).';
        return genres.length ? null : 'Pick at least one genre or service.';
      case 3:
        if (!Number(rate)) return 'Set your booking rate.';
        return priceKind === 'RANGE' && Number(rateMax) <= Number(rate) ? 'The maximum must be higher than the minimum.' : null;
      case 4:
        return payout.verified ? null : 'Verify your payout account to continue.';
      case 5:
        return idStage === 'done' || idStage === 'inperson' ? null : 'Complete ID verification to continue.';
      default:
        return null;
    }
  };

  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  if (publishing) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <ProcessingSteps
          title="Publishing your artist profile"
          done="You’re live!"
          steps={['Saving your profile and rates', 'Linking your payout account', 'Adding you to the artist directory']}
          onDone={() => {
            becomeArtist(me.id, {
              stageName: stageName.trim(),
              sellerType,
              sellerBusiness: sellerType === 'BUSINESS' ? { name: bizName.trim(), regTaxId: bizReg.trim() } : undefined,
              category: category!,
              bio: bio.trim(),
              genres,
              languages,
              location: me.location,
              travelRadiusKm: Number(radius),
              pricing,
              payout: payoutAccountFrom(payout),
              media: media.map((m, i) => ({ kind: i === 0 ? 'MIX' : 'PHOTO', title: m.replace(/\.[^.]+$/, ''), url: '#' })),
              idVerified: idStage === 'done',
              creatorServices: creator,
            });
            router.replace(creator ? '/onboarding/creator' : '/artist?welcome=1');
          }}
        />
      </Card>
    );
  }

  if (me.artist) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="You’re already an artist" back={<BackLink href="/artist" label="Artist studio" />} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader back={<BackLink href="/sell" label="Start selling" />} title="Add Artist role" subtitle="Takes about 5 minutes. You can edit everything later." />
      <Stepper steps={STEPS} current={step} />

      <Card className="mt-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">How do you sell?</h2>
            <OptionCard selected={sellerType === 'INDIVIDUAL'} onClick={() => setSellerType('INDIVIDUAL')} icon={<User className="size-5" />} title="As an individual" description="You perform under your own name or stage name." />
            <OptionCard selected={sellerType === 'BUSINESS'} onClick={() => setSellerType('BUSINESS')} icon={<Building2 className="size-5" />} title="As a business" description="A collective, a band registered as an entity, or an agency." />
            {sellerType === 'BUSINESS' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name">
                  <Input value={bizName} onChange={(e) => setBizName(e.target.value)} />
                </Field>
                <Field label="Registration / KRA PIN">
                  <Input value={bizReg} onChange={(e) => setBizReg(e.target.value.toUpperCase())} placeholder="P051234567X" />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">What do you do?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ARTIST_CATEGORY.map((c) => (
                <OptionCard key={c} selected={category === c} onClick={() => setCategory(c)} title={ARTIST_CATEGORY_LABEL[c]} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Your public profile</h2>
            <Field label="Stage name">
              <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder={category === 'DJ' ? 'e.g. DJ Shiru' : 'e.g. MC Kace'} />
            </Field>
            <Field label="Bio" hint="What makes your sets special? Where have you played?">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
            </Field>
            <Field label="Genres & services">
              <ChipSelect options={GENRES} value={genres} onChange={setGenres} max={5} />
            </Field>
            <Field label="Languages">
              <ChipSelect options={LANGUAGES} value={languages} onChange={setLanguages} />
            </Field>
            <Field label="How far will you travel?">
              <Select value={radius} onChange={setRadius} options={['20', '50', '100', '300', '1000'].map((r) => ({ value: r, label: r === '1000' ? 'Anywhere in Kenya' : `Up to ${r} km from ${me.location.split(',')[0]}` }))} />
            </Field>
            <FileDrop label="Upload mixes, photos or reels" hint="MP3, JPG, MP4 (prototype: files aren’t really uploaded)" files={media} onChange={setMedia} multiple />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Set your rates</h2>
            <div className="grid grid-cols-2 gap-2">
              <OptionCard selected={priceKind === 'FIXED'} onClick={() => setPriceKind('FIXED')} title="Fixed rate" description="One price per booking" />
              <OptionCard selected={priceKind === 'RANGE'} onClick={() => setPriceKind('RANGE')} title="Price range" description="Depends on the event" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={priceKind === 'FIXED' ? 'Booking rate (KES)' : 'Minimum (KES)'} hint="Requests below your minimum get an automatic counter-offer.">
                <Input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ''))} />
              </Field>
              {priceKind === 'RANGE' && (
                <Field label="Maximum (KES)">
                  <Input inputMode="numeric" value={rateMax} onChange={(e) => setRateMax(e.target.value.replace(/\D/g, ''))} />
                </Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Song request price (KES)">
                <Input inputMode="numeric" value={songReq} onChange={(e) => setSongReq(e.target.value.replace(/\D/g, ''))} />
              </Field>
              <Field label="Shout-out price (KES)">
                <Input inputMode="numeric" value={shoutOut} onChange={(e) => setShoutOut(e.target.value.replace(/\D/g, ''))} />
              </Field>
            </div>
          </div>
        )}

        {step === 4 && <PayoutStep me={me} value={payout} onChange={setPayout} />}

        {step === 5 && (
          <IdVerificationStep
            stage={idStage}
            onStage={setIdStage}
            blurb="We check your national ID against IPRS and match it to a selfie. Verified artists can take higher-value bookings and get paid faster."
          />
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Also work with brands?</h2>
            <p className="text-sm text-muted">Turn on creator services to receive paid brand jobs: posts, reels and product insights. We’ll verify your follower tier from your linked socials next.</p>
            <Toggle checked={creator} onChange={setCreator} label={creator ? 'Yes, enable creator services' : 'Not now'} />
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Review & go live</h2>
            <DefinitionList
              items={[
                ['Stage name', stageName],
                ['Category', category ? ARTIST_CATEGORY_LABEL[category] : '-'],
                ['Seller', sellerType === 'BUSINESS' ? bizName : 'Individual'],
                ['Genres', genres.join(', ')],
                ['Booking rate', formatPrice(pricing.booking)],
                ['Song request / shout-out', `${formatKES(pricing.songRequest)} / ${formatKES(pricing.shoutOut)}`],
                ['Payout', `${PAYOUT_METHOD_LABEL[payout.method]} · ${payout.account}`],
                ['Identity', idStage === 'done' ? 'Verified' : 'In-person pending'],
                ['Creator services', creator ? 'On' : 'Off'],
              ]}
            />
          </div>
        )}

        {error && <div className="mt-4 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="mt-6 flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => { setError(null); setStep((s) => s - 1); }}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={() => setPublishing(true)}>Go live</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
