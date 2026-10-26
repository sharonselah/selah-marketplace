import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Montserrat, Nunito } from 'next/font/google';
import { HydrationGate, Splash } from '@/components/layout/HydrationGate';
import { Toaster } from '@/components/ui/Toast';
import '@/styles/globals.css';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });
const montserrat = Montserrat({ variable: '--font-montserrat', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Selah: nightlife, artists & bookings',
  description: 'Book artists, buy tickets and tables, and get paid. Prototype.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Everything is client-rendered from the local store; Suspense covers URL hooks under cacheComponents. */}
        <Suspense fallback={<Splash />}>
          <HydrationGate>{children}</HydrationGate>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
