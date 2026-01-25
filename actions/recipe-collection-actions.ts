'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Rezept aus Wochenplan in "Meine Rezepte" speichern (entfernt temporäres Flag)
export async function saveRecipeToCollection(resultId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  try {
    // Prüfe ob Result existiert und dem User gehört
    const result = await prisma.result.findFirst({
      where: {
        id: resultId,
        userId: session.user.id,
        toolId: 'recipe',
      },
    });

    if (!result) {
      return { error: 'Rezept nicht gefunden' };
    }

    // Parse Metadata
    let metadata: any = {};
    if (result.metadata) {
      try {
        metadata = JSON.parse(result.metadata);
      } catch {
        metadata = {};
      }
    }

    // Entferne temporäres Flag und markiere als gespeichert
    delete metadata.isTemporary;
    metadata.savedToCollection = true;
    metadata.savedAt = new Date().toISOString();

    // Update Result
    await prisma.result.update({
      where: { id: resultId },
      data: {
        metadata: JSON.stringify(metadata),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[RECIPE-COLLECTION] ❌ Fehler:', error);
    return { error: 'Fehler beim Speichern' };
  }
}
