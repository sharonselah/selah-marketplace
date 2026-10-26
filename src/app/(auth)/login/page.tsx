'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Display';
import { Field, Input } from '@/components/ui/Field';
import { loginAs, startLogin } from '@/lib/store/actions/auth';
import { useWorld } from '@/lib/store/hooks';

export default function LoginPage() {
  const router = useRouter();
  const world = useWorld();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const demos = world.people.filter((p) => p.demo);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const res = startLogin(identifier);
      if (!res.ok) {
        setLoading(false);
        return setError(res.error);
      }
      router.push('/verify');
    }, 700);
  };

  return (
    <div>
      <h1 className="text-title text-text">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in with the phone number or email you signed up with.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="Phone or email">
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0712 345 678 or you@example.com" autoComplete="username" required />
        </Field>
        {error && (
          <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}{' '}
            <Link href="/register" className="font-medium underline">
              Create an account
            </Link>
          </div>
        )}
        <Button type="submit" size="lg" block loading={loading}>
          {loading ? 'Sending code…' : 'Send me a code'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Selah?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3 text-sm text-muted">
          <span className="h-px flex-1 bg-border" /> Or explore with a demo account <span className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-col gap-2">
          {demos.map((p) => (
            <button
              key={p.id}
              // GuestOnly redirects to the right home once the session exists.
              onClick={() => loginAs(p.id)}
              className="flex items-center gap-3 rounded-tile bg-surface p-3 text-left shadow-card transition hover:shadow-raised"
            >
              <Avatar name={p.name} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-text">{p.artist?.stageName ?? p.name}</span>
                <span className="truncate text-xs text-muted">{p.demo!.tagline}</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
