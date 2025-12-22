import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const body = await req.text();
  
  // WICHTIG: Hier fehlte das 'await' im alten Code!
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook Signatur Fehler:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`🔔 Event empfangen: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session?.metadata?.userId;

    console.log("👤 User ID aus Metadata:", userId);

    if (!userId) {
      console.error("❌ Keine User ID gefunden!");
      return new NextResponse('User ID not found', { status: 400 });
    }

    try {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionEnd: oneYearFromNow,
          stripeCustomerId: session.customer as string,
        },
      });
      
      console.log(`✅ ERFOLG: User ${userId} wurde freigeschaltet!`);
    } catch (dbError) {
      console.error("❌ Datenbank Fehler:", dbError);
      return new NextResponse('Database Error', { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}