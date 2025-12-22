'use server';

import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';

export async function createCheckoutSession() {
  const session = await auth();

  if (!session?.user || !session.user.email) {
    return { error: 'Nicht eingeloggt.' };
  }

  // 1. Stripe Checkout Session erstellen
  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email, // Füllt E-Mail bei Stripe automatisch aus
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'payment', // WICHTIG: 'payment' für Einmalzahlung, 'subscription' für Abo
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
    metadata: {
      userId: session.user.id, // Das brauchen wir später, um den Kauf dem User zuzuordnen!
    },
  });

  // 2. Weiterleiten
  if (!checkoutSession.url) {
    return { error: 'Fehler bei Stripe.' };
  }

  redirect(checkoutSession.url);
}