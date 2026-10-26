import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc } from '../LegalDoc';

export const metadata: Metadata = { title: 'Terms of Service · Selah' };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="23 October 2026"
      sections={[
        {
          heading: 'Who we are',
          body: <p>Selah is a marketplace for nightlife, artists and bookings. These terms apply to everyone who uses Selah, whether buying, selling, performing or running a business account.</p>,
        },
        {
          heading: 'Your account',
          body: (
            <>
              <p>You need a verified phone number or email to create an account. Keep your login details safe; you’re responsible for activity on your account.</p>
              <p>To sell, perform or receive payouts you must complete identity verification and add a payout account.</p>
            </>
          ),
        },
        {
          heading: 'Payments and escrow',
          body: (
            <>
              <p>Payments for tickets, bookings, orders and creator jobs are held in escrow by Selah. The seller is paid only after the item or service has been delivered.</p>
              <p>Selah deducts a platform fee from each payout. Current fees are shown before you list or accept work.</p>
            </>
          ),
        },
        {
          heading: 'Your Selah wallet',
          body: <p>Your wallet holds top-ups, refunds and earnings. Withdrawals go to the payout account you’ve verified.</p>,
        },
        {
          heading: 'Disputes and refunds',
          body: <p>If something goes wrong, you can open a dispute. This freezes the funds in escrow while our team reviews it. If it’s resolved in your favour, you’re refunded to your Selah wallet.</p>,
        },
        {
          heading: 'What you can’t do',
          body: <p>Don’t list illegal, counterfeit or misleading items, impersonate others, or try to take payments outside Selah. We may suspend accounts that break these rules.</p>,
        },
        {
          heading: 'Earn with Selah',
          body: <p>Referral rewards and commissions are paid once the qualifying action is confirmed. We may withhold rewards gained through fraud or self-referral.</p>,
        },
        {
          heading: 'Privacy',
          body: (
            <p>
              How we handle your data is described in our{' '}
              <Link href="/privacy" className="font-medium text-brand hover:underline">Privacy Policy</Link>.
            </p>
          ),
        },
        {
          heading: 'Changes',
          body: <p>We may update these terms. If we make significant changes, we’ll tell you in the app before they take effect.</p>,
        },
      ]}
    />
  );
}
