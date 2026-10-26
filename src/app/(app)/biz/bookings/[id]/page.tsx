'use client';

import { useParams } from 'next/navigation';
import { BuyerBookingView } from '@/components/shared/BuyerBookingView';
import type { BookingRequestId } from '@/types';

export default function BizBookingPage() {
  const { id } = useParams<{ id: BookingRequestId }>();
  return <BuyerBookingView requestId={id} backHref="/biz/bookings" />;
}
