import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isUserPremium() {
  const session = await auth();

  // 1. Ist er überhaupt eingeloggt?
  if (!session?.user?.id) {
    return false;
  }

  // 2. Datenbank fragen
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionEnd: true } // Wir brauchen nur das Datum
  });

  // 3. Haben wir ein Datum?
  if (!user?.subscriptionEnd) {
    return false;
  }

  // 4. Ist das Datum in der Zukunft?
  const isValid = user.subscriptionEnd > new Date();
  
  return isValid;
}