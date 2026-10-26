'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { OtpInput, ProcessingSteps } from '@/components/ui/Interactive';
import { DEMO_OTP, cancelPendingAuth, resendOtp, verifyOtp } from '@/lib/store/actions/auth';
import { useStore } from '@/lib/store/hooks';
import { byId } from '@/lib/selectors';

const RESEND_SECONDS = 30;

/** Simulated incoming SMS / email so testers "receive" the code. */
function FakeInboxMessage({ channel, sentAt, onUse }: { channel: 'SMS' | 'EMAIL'; sentAt: string; onUse: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, [sentAt]);
  if (!visible) return null;
  const Icon = channel === 'SMS' ? MessageSquare : Mail;
  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-card bg-surface/95 p-4 shadow-float backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="size-3.5" /> {channel === 'SMS' ? 'Messages' : 'Mail'} · now
      </div>
      <div className="mt-1 text-sm text-text">
        <span className="font-semibold">Selah:</span> Your verification code is <span className="font-mono font-semibold">{DEMO_OTP}</span>. Don’t share it with anyone.
      </div>
      <button onClick={onUse} className="mt-2 text-xs font-medium text-brand hover:underline">
        Use this code
      </button>
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const { pendingAuth, session, world } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<null | { mode: 'REGISTER' | 'LOGIN' }>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (verifying) {
    const register = verifying.mode === 'REGISTER';
    return (
      <AuthLayout>
        <ProcessingSteps
          title={register ? 'Setting up your account' : 'Signing you in'}
          done={register ? 'All set!' : 'Welcome back!'}
          steps={register ? ['Verifying your code', 'Creating your Selah account', 'Setting up your wallet'] : ['Verifying your code', 'Loading your account']}
          stepMs={900}
          onDone={() => {
            const res = verifyOtp(code);
            if (!res.ok) {
              setVerifying(null);
              setError(res.error);
              return;
            }
            router.replace(register ? '/welcome' : '/home');
          }}
        />
      </AuthLayout>
    );
  }

  if (!pendingAuth) {
    const me = session ? byId(world.people, session.personId) : undefined;
    return (
      <AuthLayout>
        <div className="text-center">
          <h1 className="text-heading text-text">{me ? `You’re signed in as ${me.name}` : 'Your code has expired'}</h1>
          <p className="mt-2 text-sm text-muted">{me ? 'Head to your home screen.' : 'Start again to get a new verification code.'}</p>
          <div className="mt-6 flex justify-center gap-2">
            {me ? (
              <Button onClick={() => router.replace('/home')}>Go home</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => router.push('/login')}>Log in</Button>
                <Button onClick={() => router.push('/register')}>Sign up</Button>
              </>
            )}
          </div>
        </div>
      </AuthLayout>
    );
  }

  const register = pendingAuth.mode === 'REGISTER';
  const firstName = pendingAuth.draft?.name.split(' ')[0];
  const secondsLeft = Math.max(0, RESEND_SECONDS - Math.floor((now - new Date(pendingAuth.sentAt).getTime()) / 1000));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    setError(null);
    setVerifying({ mode: pendingAuth.mode });
  };

  return (
    <AuthLayout>
      <FakeInboxMessage channel={pendingAuth.channel} sentAt={pendingAuth.sentAt} onUse={() => setCode(DEMO_OTP)} />
      <div className="flex flex-col items-center text-center">
        {pendingAuth.channel === 'SMS' ? <MessageSquare className="size-7 text-brand" /> : <Mail className="size-7 text-brand" />}
        <h1 className="mt-4 text-title text-text">{register ? `Thanks for registering, ${firstName}!` : 'Check your messages'}</h1>
        <p className="mt-2 text-sm text-muted">
          {pendingAuth.channel === 'SMS' ? 'We’ve sent a 6-digit code by SMS to ' : 'Check your email. We’ve sent a 6-digit code to '}
          <span className="font-medium text-text">{pendingAuth.destination}</span>.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <OtpInput value={code} onChange={setCode} autoFocus />
        {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-center text-sm text-bad">{error}</div>}
        <Button type="submit" size="lg" block disabled={code.length < 6}>
          Verify
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {secondsLeft > 0 ? (
          <span className="text-muted">Resend code in 0:{String(secondsLeft).padStart(2, '0')}</span>
        ) : (
          <button className="font-medium text-brand hover:underline" onClick={() => resendOtp()}>
            Resend code
          </button>
        )}
        <Link
          href={register ? '/register' : '/login'}
          onClick={() => cancelPendingAuth()}
          className="text-muted hover:text-text"
        >
          {pendingAuth.channel === 'SMS' ? 'Wrong number?' : 'Wrong email?'} Go back
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Prototype: no message is really sent. Use <span className="font-mono font-semibold text-text">{DEMO_OTP}</span> (any 6 digits work).
      </p>
    </AuthLayout>
  );
}
