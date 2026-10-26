'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, OptionCard, Select } from '@/components/ui/Field';
import { AREAS } from '@/lib/data/pools';
import { startRegistration } from '@/lib/store/actions/auth';

const LOCATIONS = AREAS.map((a) => ({ value: a.includes('Mombasa') || a.includes('Kisumu') || a.includes('Nakuru') || a.includes('Diani') ? a : `${a}, Nairobi`, label: a }));

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState<string>('');
  const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [referral, setReferral] = useState(params.get('ref') ?? '');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().split(/\s+/).length < 2) return setError('Please enter your first and last name.');
    if (!location) return setError('Choose where you’re based.');
    // Dev-only rule (not shown to users): SLH + 3 digits, e.g. SLH003.
    if (referral.trim() && !/^SLH\d{3}$/.test(referral.trim())) return setError('Invalid referral code.');
    if (!terms) return setError('Please accept the terms to continue.');
    setLoading(true);
    // A short pause so "sending code" feels real.
    setTimeout(() => {
      const res = startRegistration({ name, phone, email: email || undefined, location, channel, referralCode: referral });
      if (!res.ok) {
        setLoading(false);
        return setError(res.error);
      }
      router.push('/verify');
    }, 900);
  };

  return (
    <div>
      <h1 className="text-title text-text">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Everyone starts as a Patron. You can add an Artist role or a Business Account any time.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wanjiru Kamau" autoComplete="name" required />
        </Field>
        <Field label="Mobile number" hint="Used for M-Pesa payments and sign-in.">
          <Input prefix="+254" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="712 345 678" inputMode="tel" autoComplete="tel" required />
        </Field>
        <Field label={<>Email <span className="font-normal text-muted">(optional)</span></>}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Where are you based?">
          <Select value={location} onChange={setLocation} options={LOCATIONS} placeholder="Choose an area" />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Send my verification code by</span>
          <div className="grid grid-cols-2 gap-2">
            <OptionCard selected={channel === 'SMS'} onClick={() => setChannel('SMS')} icon={<MessageSquare className="size-4" />} title="SMS" />
            <OptionCard selected={channel === 'EMAIL'} onClick={() => setChannel('EMAIL')} icon={<Mail className="size-4" />} title="Email" />
          </div>
        </div>

        <Field label={<>Referral code <span className="font-normal text-muted">(optional)</span></>} hint="Got a code from a friend? They earn a reward when you make your first purchase.">
          <Input value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="Enter code" />
        </Field>

        <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} 
          label={
            <>
              I agree to Selah’s{' '}
              <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">Privacy Policy</Link>
            </>
          }
        />

        {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Sending code…' : 'Continue'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
