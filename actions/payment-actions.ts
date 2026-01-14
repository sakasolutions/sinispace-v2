'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function createCheckoutSession() {
  const session = await auth();

  if (!session?.user || !session.user.email) {
    redirect('/login');
    return;
  }

  // Direkt auf den Stripe Payment Link weiterleiten
  redirect('https://buy.stripe.com/7sY8wQ07ycYp936gqVawo07');
}