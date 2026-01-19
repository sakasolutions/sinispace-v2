import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChatLayoutWrapper } from '@/components/chat-layout-wrapper';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Security Check: Ist der User eingeloggt?
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Performance-Optimierung: Email aus Session nutzen (kein DB-Query für Email nötig)
  // Nur subscriptionEnd aus DB holen (nicht verfügbar in Session)
  // Email ist bereits in session.user.email verfügbar (aus authorize callback)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionEnd: true, // Nur das was wir wirklich brauchen
    },
  });
  
  // WICHTIG: Kein $disconnect() mehr - wir nutzen Singleton Pattern

  // Premium-Status prüfen
  const isPro = !!(user?.subscriptionEnd && user.subscriptionEnd > new Date());

  // Email aus Session nutzen (bereits verfügbar aus authorize callback)
  // SICHERHEIT: session.user.email ist sicher, da aus DB beim Login geholt
  const userEmail = session.user.email || '';

  return (
    <ChatLayoutWrapper userEmail={userEmail} isPro={isPro}>
      {children}
    </ChatLayoutWrapper>
  );
}
