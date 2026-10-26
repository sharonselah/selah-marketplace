import type { ReactNode } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GuestOnly } from '@/components/layout/Guards';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <GuestOnly>
      <AuthLayout>{children}</AuthLayout>
    </GuestOnly>
  );
}
