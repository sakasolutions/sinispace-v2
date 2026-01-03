import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { ChatLayoutWrapper } from '@/components/chat-layout-wrapper';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Security Check: Ist der User eingeloggt?
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Prisma Client instanziieren
  const db = new PrismaClient();

  // User aus Datenbank holen
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      subscriptionEnd: true,
    },
  });

  // Prisma Client schließen
  await db.$disconnect();

  // Premium-Status prüfen
  const isPro = !!(user?.subscriptionEnd && user.subscriptionEnd > new Date());

  // Fallback für Email (falls nicht in DB vorhanden)
  const userEmail = user?.email || session.user.email || '';

  return (
    <ChatLayoutWrapper userEmail={userEmail} isPro={isPro}>
      {children}
    </ChatLayoutWrapper>
  );
}
