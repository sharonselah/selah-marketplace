import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RequireSession } from '@/components/layout/Guards';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}
