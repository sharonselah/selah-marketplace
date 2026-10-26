import type { Metadata } from 'next';
import { LegalDoc } from '../LegalDoc';

export const metadata: Metadata = { title: 'Privacy Policy · Selah' };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="23 October 2026"
      sections={[
        {
          heading: 'What we collect',
          body: <p>When you register or use Selah, we collect your name, phone number, email (if you give one) and location. If you sell or perform, we also collect your verification documents and payout details. We also keep a record of your purchases, bookings and wallet activity.</p>,
        },
        {
          heading: 'How we use it',
          body: <p>We use your data to run your account, process payments and escrow, verify sellers, resolve disputes, prevent fraud and send you notifications about your activity.</p>,
        },
        {
          heading: 'Who we share it with',
          body: <p>We share only what’s needed to complete a transaction with the other party, such as your name on a booking. We also share data with payment providers such as M-Pesa and card processors, and with authorities when the law requires it. We never sell your personal data.</p>,
        },
        {
          heading: 'How long we keep it',
          body: <p>We keep account data while your account is open, and transaction records for as long as financial regulations require.</p>,
        },
        {
          heading: 'Your rights',
          body: <p>Under the Kenya Data Protection Act, 2019, you can ask to see, correct or delete your personal data, or object to how we use it. You can make a request from your account settings.</p>,
        },
        {
          heading: 'Security',
          body: <p>We protect your data with access controls and encryption. Never share your verification code with anyone, including people claiming to be from Selah.</p>,
        },
      ]}
    />
  );
}
