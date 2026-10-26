import type { ReactNode } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { RequireSession } from '@/components/layout/Guards';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession admin>
      <AdminShell>{children}</AdminShell>
    </RequireSession>
  );
}
