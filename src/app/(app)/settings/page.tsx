'use client';

import { useState } from 'react';
import { Laptop, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, IconCircle, PageHeader } from '@/components/ui/Display';
import { Field, Input, Select, Toggle } from '@/components/ui/Field';
import { Modal, OtpInput, ProcessingSteps, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { PayMark } from '@/components/ui/Visuals';
import { PAYOUT_METHOD_LABEL, VERIFICATION_LABEL } from '@/lib/constants/labels';
import type { PayoutMethod } from '@/lib/constants/enums';
import { AREAS } from '@/lib/data/pools';
import { DEFAULT_PREFS, updatePrefs, updateProfile } from '@/lib/store/actions/account';
import { useViewer } from '@/lib/store/hooks';

type Tab = 'profile' | 'security' | 'notifications' | 'payouts' | 'privacy';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6 w-fit max-w-full"
        tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'security', label: 'Security' },
          { value: 'notifications', label: 'Notifications' },
          { value: 'payouts', label: 'Payout accounts' },
          { value: 'privacy', label: 'Privacy & language' },
        ]}
      />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'privacy' && <PrivacyTab />}
    </div>
  );
}

function ProfileTab() {
  const { me } = useViewer();
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email ?? '');
  const [location, setLocation] = useState(me.location);
  return (
    <Card>
      <CardHeader title="Basic profile" subtitle="This is what sellers see when you buy or book." action={<Badge tone="good">{VERIFICATION_LABEL[me.verification]}</Badge>} />
      <div className="flex flex-col gap-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone" hint="Changing your phone number requires re-verification (coming soon).">
          <Input value={me.phone} disabled />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Location">
          <Select value={location} onChange={setLocation} options={[...new Set([me.location, ...AREAS.map((a) => `${a}, Nairobi`)])].map((v) => ({ value: v, label: v }))} />
        </Field>
        <Button
          className="self-start"
          onClick={() => {
            updateProfile(me.id, { name, email, location });
            toast('Profile saved');
          }}
        >
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function SecurityTab() {
  const { me } = useViewer();
  const prefs = { ...DEFAULT_PREFS, ...me.prefs };
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const devices = [
    { icon: Smartphone, name: 'This browser', where: `${me.location.split(',')[0]} · Active now`, current: true },
    { icon: Smartphone, name: 'Tecno Spark 20', where: 'Nairobi · 2 days ago', current: false },
    { icon: Laptop, name: 'Chrome on Windows', where: 'Nairobi · 3 weeks ago', current: false },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Sign-in & approvals" subtitle="Protect payments and payouts." />
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium text-text">Transaction PIN</div>
              <div className="text-xs text-muted">Ask for a 4-digit PIN before payments and withdrawals.</div>
            </div>
            <Toggle checked={prefs.pinEnabled} onChange={(v) => (v ? setPinModal(true) : updatePrefs(me.id, { pinEnabled: false }))} />
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium text-text">Biometric unlock</div>
              <div className="text-xs text-muted">Use fingerprint or Face ID on supported phones.</div>
            </div>
            <Toggle checked={prefs.biometricEnabled} onChange={(v) => { updatePrefs(me.id, { biometricEnabled: v }); toast(v ? 'Biometric unlock enabled' : 'Biometric unlock disabled', 'info'); }} />
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Devices & sessions" />
        <div className="flex flex-col gap-1">
          {devices.map((d) => (
            <div key={d.name} className="flex items-center gap-3 py-3">
              <IconCircle tone="neutral" icon={<d.icon className="size-4" />} />
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{d.name}</div>
                <div className="text-xs text-muted">{d.where}</div>
              </div>
              {d.current ? <Badge tone="good">This device</Badge> : <Button size="sm" variant="ghost" onClick={() => toast(`Signed out of ${d.name}`, 'info')}>Sign out</Button>}
            </div>
          ))}
        </div>
      </Card>
      <Modal open={pinModal} onClose={() => setPinModal(false)} title="Set a transaction PIN">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">Choose a 4-digit PIN. You’ll enter it before payments and withdrawals.</p>
          <OtpInput value={pin} onChange={setPin} length={4} autoFocus />
          <Button
            block
            disabled={pin.length < 4}
            onClick={() => {
              updatePrefs(me.id, { pinEnabled: true });
              setPin('');
              setPinModal(false);
              toast('Transaction PIN set');
            }}
          >
            Save PIN
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function NotificationsTab() {
  const { me } = useViewer();
  const prefs = { ...DEFAULT_PREFS, ...me.prefs };
  const rows = [
    ['SMS', 'Bookings, payments and OTP codes'],
    ['PUSH', 'Real-time updates on your phone'],
    ['EMAIL', 'Receipts and weekly summaries'],
  ] as const;
  return (
    <Card>
      <CardHeader title="How we reach you" />
      <div className="flex flex-col gap-1">
        {rows.map(([ch, desc]) => (
          <div key={ch} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium text-text">{ch === 'PUSH' ? 'Push notifications' : ch === 'SMS' ? 'SMS' : 'Email'}</div>
              <div className="text-xs text-muted">{desc}</div>
            </div>
            <Toggle checked={prefs.notify[ch]} onChange={(v) => updatePrefs(me.id, { notify: { ...prefs.notify, [ch]: v } })} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function PayoutsTab() {
  const { me } = useViewer();
  const current = me.artist?.payout ?? me.prefs?.payout;
  const [method, setMethod] = useState<PayoutMethod>(current?.method ?? 'MPESA');
  const [account, setAccount] = useState(current?.method === 'BANK' ? '' : me.phone);
  const [bank, setBank] = useState('Equity Bank');
  const [verifying, setVerifying] = useState(false);
  return (
    <Card>
      <CardHeader title="Payout account" subtitle="Where your earnings and rewards are sent." action={current?.verified && <Badge tone="good"><ShieldCheck className="size-3" /> Verified</Badge>} />
      {current && (
        <p className="mb-4 text-sm text-muted">
          Current: {PAYOUT_METHOD_LABEL[current.method]} · {current.bankName ? `${current.bankName} ` : ''}{current.account}
        </p>
      )}
      {verifying ? (
        <ProcessingSteps
          title="Verifying account"
          done="Account verified"
          steps={method === 'MPESA' ? ['Checking M-Pesa registration', 'Confirming name matches your ID'] : ['Validating account number', 'Confirming account holder name']}
          onDone={() => {
            updatePrefs(me.id, { payout: { method, account: method === 'MPESA' ? account : `•••• ${account.slice(-4)}`, bankName: method === 'BANK' ? bank : undefined, schedule: 'WEEKLY', verified: true } });
            setVerifying(false);
            toast('Payout account saved');
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(['MPESA', 'BANK'] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`flex items-center gap-3 rounded-tile p-3 text-left text-sm font-medium text-text transition ${method === m ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface-2 hover:bg-brand-soft'}`}>
                <PayMark method={m} />
                {PAYOUT_METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          {method === 'BANK' && (
            <Field label="Bank">
              <Select value={bank} onChange={setBank} options={['Equity Bank', 'KCB', 'Co-operative Bank', 'NCBA', 'Absa Kenya', 'Stanbic'].map((b) => ({ value: b, label: b }))} />
            </Field>
          )}
          <Field label={method === 'MPESA' ? 'M-Pesa number' : 'Account number'}>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} />
          </Field>
          <Button className="self-start" disabled={account.length < 6} onClick={() => setVerifying(true)}>
            Verify & save
          </Button>
        </div>
      )}
    </Card>
  );
}

function PrivacyTab() {
  const { me } = useViewer();
  const prefs = { ...DEFAULT_PREFS, ...me.prefs };
  return (
    <Card>
      <CardHeader title="Privacy & language" />
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-text">Public profile</div>
            <div className="text-xs text-muted">Let artists and venues see your name on bookings and orders.</div>
          </div>
          <Toggle checked={prefs.profilePublic} onChange={(v) => updatePrefs(me.id, { profilePublic: v })} />
        </div>
        <Field label="Language">
          <Select value={prefs.language} onChange={(v) => { updatePrefs(me.id, { language: v }); toast(v === 'SW' ? 'Lugha imebadilishwa (prototype: English only)' : 'Language updated', 'info'); }} options={[{ value: 'EN', label: 'English' }, { value: 'SW', label: 'Kiswahili' }]} />
        </Field>
        <Button variant="ghost" className="self-start text-bad" onClick={() => toast('Data export requested. We’ll email you a link (prototype)', 'info')}>
          Download my data
        </Button>
      </div>
    </Card>
  );
}
