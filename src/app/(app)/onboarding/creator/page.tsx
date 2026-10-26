'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BackLink } from '@/components/shared/Cards';
import { DEFAULT_RATE_CARD, RateCardEditor, SocialLinker, TierBadge, rateCardFrom, type RateRow } from '@/components/shared/Creator';
import { IdVerificationStep, PayoutStep, payoutAccountFrom, type IdStage, type PayoutDraft } from '@/components/shared/SellerSteps';
import { Button, LinkButton } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Card, DefinitionList, EmptyState, PageHeader } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Field';
import { ProcessingSteps, Stepper } from '@/components/ui/Interactive';
import { CREATOR_TIER_LABEL, PAYOUT_METHOD_LABEL } from '@/lib/constants/labels';
import { CREATOR_NICHES } from '@/lib/data/pools';
import { formatCount, formatKES } from '@/lib/format';
import { currentPolicy, isCreator, tierFor } from '@/lib/selectors';
import { setupCreator, type Social } from '@/lib/store/actions/creator';
import { useViewer } from '@/lib/store/hooks';

type StepId = 'NAME' | 'NICHE' | 'RATES' | 'SOCIALS' | 'PAYOUT' | 'ID' | 'REVIEW';
const STEP_LABEL: Record<StepId, string> = { NAME: 'Name', NICHE: 'Niche', RATES: 'Rate card', SOCIALS: 'Socials & tier', PAYOUT: 'Payout', ID: 'ID verification', REVIEW: 'Review' };

/** Enable creator services: from the Artist wizard, later from the studio, or creator-only from scratch. */
export default function CreatorOnboarding() {
  const { world, me } = useViewer();
  const router = useRouter();
  // Existing artists already passed payout + ID; creator-only sellers do those here.
  const newSeller = !me.artist;
  const steps: StepId[] = newSeller ? ['NAME', 'NICHE', 'RATES', 'SOCIALS', 'PAYOUT', 'ID', 'REVIEW'] : ['NICHE', 'RATES', 'SOCIALS', 'REVIEW'];
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [name, setName] = useState(me.name);
  const [niche, setNiche] = useState<string[]>([]);
  const [rates, setRates] = useState<RateRow[]>(DEFAULT_RATE_CARD);
  const [socials, setSocials] = useState<Social[]>([]);
  const [payout, setPayout] = useState<PayoutDraft>({ method: 'MPESA', account: me.phone, verified: false });
  const [idStage, setIdStage] = useState<IdStage>(me.verification !== 'PHONE_VERIFIED' ? 'done' : 'form');

  const policy = currentPolicy(world);
  const followers = socials.reduce((a, s) => a + s.followers, 0);
  const tier = tierFor(followers, policy);
  const current = steps[step];

  if (isCreator(me.artist) && me.artist?.creator && !publishing) {
    return <EmptyState title="Creator services are on" body="Your creator profile is already set up." action={<LinkButton href="/creator">Open creator profile</LinkButton>} />;
  }

  const validate = (): string | null => {
    switch (current) {
      case 'NAME':
        return name.trim().length >= 2 ? null : 'Add the name brands will see.';
      case 'NICHE':
        return niche.length ? null : 'Pick at least one niche.';
      case 'RATES':
        return rateCardFrom(rates).length ? null : 'Add at least one deliverable with a price.';
      case 'SOCIALS':
        if (!socials.length) return 'Link at least one social account so we can verify your tier.';
        return tier ? null : `You need at least ${policy.tierThresholds.NANO} followers to join as a creator.`;
      case 'PAYOUT':
        return payout.verified ? null : 'Verify your payout account to continue.';
      case 'ID':
        return idStage === 'done' || idStage === 'inperson' ? null : 'Complete ID verification to continue.';
      default:
        return null;
    }
  };

  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };

  if (publishing) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <ProcessingSteps
          title="Setting up creator services"
          done="You’re ready for brand jobs!"
          steps={['Saving your rate card', `Locking in your ${tier ?? 'NANO'} tier`, 'Matching you to open campaigns']}
          onDone={() => {
            setupCreator(me.id, {
              niche,
              rateCard: rateCardFrom(rates),
              socials,
              newSeller: newSeller ? { stageName: name.trim(), payout: payoutAccountFrom(payout), idVerified: idStage === 'done' } : undefined,
            });
            router.replace('/creator?welcome=1');
          }}
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={<BackLink href={newSeller ? '/sell' : '/artist'} label={newSeller ? 'Start selling' : 'Artist studio'} />}
        title="Enable creator services"
        subtitle="Get paid by brands for posts, reels and product insights."
      />
      <Stepper steps={steps.map((s) => STEP_LABEL[s])} current={step} />

      <Card className="mt-6">
        {current === 'NAME' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">What should brands call you?</h2>
            <Field label="Creator name" hint="Your name or the name you post under.">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
        )}

        {current === 'NICHE' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">What do you post about?</h2>
            <p className="text-sm text-muted">Brands filter the creator directory by niche. Pick up to 3.</p>
            <ChipSelect options={CREATOR_NICHES} value={niche as (typeof CREATOR_NICHES)[number][]} onChange={setNiche} max={3} />
          </div>
        )}

        {current === 'RATES' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Your rate card</h2>
            <p className="text-sm text-muted">What you usually charge per deliverable. Brands see this when they invite you; you can still pitch any price on open campaigns.</p>
            <RateCardEditor value={rates} onChange={setRates} />
          </div>
        )}

        {current === 'SOCIALS' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Link your socials</h2>
            <p className="text-sm text-muted">We read your follower count straight from each platform to assign your tier. We never post on your behalf.</p>
            <SocialLinker value={socials} onChange={setSocials} />
            {socials.length > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <div className="text-xs text-muted">Total followers</div>
                  <div className="text-heading text-text">{formatCount(followers)}</div>
                </div>
                {tier ? <TierBadge tier={tier} /> : <span className="text-sm text-warn">Below {policy.tierThresholds.NANO} followers</span>}
              </div>
            )}
          </div>
        )}

        {current === 'PAYOUT' && <PayoutStep me={me} value={payout} onChange={setPayout} />}

        {current === 'ID' && (
          <IdVerificationStep stage={idStage} onStage={setIdStage} blurb="We check your national ID against IPRS and match it to a selfie, so brands know who they’re paying." />
        )}

        {current === 'REVIEW' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-heading text-text">Review & go live</h2>
            <DefinitionList
              items={[
                ['Name', newSeller ? name : me.artist!.stageName],
                ['Niche', niche.join(', ')],
                ['Rate card', rateCardFrom(rates).map((r) => `${r.deliverable} ${formatKES(r.price)}`).join(' · ')],
                ['Socials', socials.map((s) => s.handle).join(', ')],
                ['Tier', tier ? `${CREATOR_TIER_LABEL[tier]} (${formatCount(followers)} followers)` : '-'],
                ...(newSeller
                  ? ([
                      ['Payout', `${PAYOUT_METHOD_LABEL[payout.method]} · ${payout.account}`],
                      ['Identity', idStage === 'done' ? 'Verified' : 'In-person pending'],
                    ] as [string, string][])
                  : []),
              ]}
            />
            <p className="text-xs text-muted">Your tier is rechecked every {policy.tierRecheckDays} days, or whenever you link a new account.</p>
          </div>
        )}

        {error && <div className="mt-4 rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="mt-6 flex justify-between gap-2 border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => { setError(null); setStep((s) => s - 1); }}>
            Back
          </Button>
          {step < steps.length - 1 ? <Button onClick={next}>Continue</Button> : <Button onClick={() => setPublishing(true)}>Go live</Button>}
        </div>
      </Card>
    </div>
  );
}
