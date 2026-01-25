'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';

// Default Workspace bei Registrierung erstellen
export async function createDefaultWorkspace(userId: string) {
  try {
    // Prüfe ob Workspace-Tabelle existiert (Graceful Degradation)
    try {
      const defaultWorkspace = await prisma.workspace.create({
        data: {
          userId,
          name: 'Allgemein',
          icon: 'Folder',
          color: 'blue',
          isArchived: false,
        },
      });
      console.log('[WORKSPACE] ✅ Default Workspace erstellt:', defaultWorkspace.id);
      return { success: true, workspace: defaultWorkspace };
    } catch (prismaError: any) {
      // Wenn Tabelle nicht existiert (P2021 = Table does not exist)
      if (prismaError.code === 'P2021' || prismaError.message?.includes('does not exist')) {
        console.warn('[WORKSPACE] ⚠️ Workspace-Tabelle existiert noch nicht. Migration muss ausgeführt werden.');
        return { success: false, error: 'Workspace-Tabelle existiert noch nicht. Bitte Migration ausführen.' };
      }
      throw prismaError;
    }
  } catch (error: any) {
    console.error('[WORKSPACE] ❌ Fehler beim Erstellen des Default-Workspaces:', error);
    return { success: false, error: `Fehler: ${error?.message || 'Unbekannter Fehler'}` };
  }
}

// Alle Workspaces eines Users abrufen
export async function getUserWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        userId: session.user.id,
        isArchived: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return { success: true, workspaces };
  } catch (error) {
    console.error('Fehler beim Abrufen der Workspaces:', error);
    return { success: false, error: 'Fehler beim Laden der Workspaces' };
  }
}

// Workspace erstellen
export async function createWorkspace(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  const name = (formData.get('name') as string)?.trim();
  const icon = (formData.get('icon') as string) || 'Folder';
  const color = (formData.get('color') as string) || 'blue';

  if (!name || name.length === 0) {
    return { success: false, error: 'Workspace-Name ist erforderlich' };
  }

  try {
    // Prüfe ob Workspace-Tabelle existiert (Graceful Degradation)
    try {
      // Premium-Check: Free Users = 3 Workspaces max
      const isPremium = await isUserPremium();
      if (!isPremium) {
        const workspaceCount = await prisma.workspace.count({
          where: {
            userId: session.user.id,
            isArchived: false,
          },
        });

        if (workspaceCount >= 3) {
          return {
            success: false,
            error: 'Free-User-Limit erreicht. Upgrade auf Premium für unbegrenzte Workspaces.',
          };
        }
      }

      const workspace = await prisma.workspace.create({
        data: {
          userId: session.user.id,
          name,
          icon,
          color,
          isArchived: false,
        },
      });

      console.log('[WORKSPACE] ✅ Workspace erstellt:', workspace.id, workspace.name);
      return { success: true, workspace };
    } catch (prismaError: any) {
      // Wenn Tabelle nicht existiert (P2021 = Table does not exist)
      if (prismaError.code === 'P2021' || prismaError.message?.includes('does not exist')) {
        console.error('[WORKSPACE] ❌ Workspace-Tabelle existiert nicht. Migration erforderlich.');
        return {
          success: false,
          error: 'Workspace-System noch nicht aktiviert. Bitte Migration ausführen: npx prisma migrate deploy',
        };
      }
      // Andere Prisma-Fehler
      console.error('[WORKSPACE] ❌ Prisma-Fehler:', prismaError);
      if (prismaError.code === 'P2002') {
        return { success: false, error: 'Workspace mit diesem Namen existiert bereits.' };
      }
      if (prismaError.code === 'P2025') {
        return { success: false, error: 'User nicht gefunden.' };
      }
      throw prismaError;
    }
  } catch (error: any) {
    console.error('[WORKSPACE] ❌ Unerwarteter Fehler beim Erstellen des Workspaces:', error);
    const errorMessage = error?.message || 'Fehler beim Erstellen des Workspaces';
    return { success: false, error: `Fehler: ${errorMessage}` };
  }
}

// Workspace aktualisieren
export async function updateWorkspace(workspaceId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  const name = (formData.get('name') as string)?.trim();
  const icon = (formData.get('icon') as string);
  const color = (formData.get('color') as string);

  try {
    // Prüfe ob Workspace dem User gehört
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: session.user.id,
      },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace nicht gefunden' };
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(color && { color }),
      },
    });

    return { success: true, workspace: updated };
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Workspaces:', error);
    return { success: false, error: 'Fehler beim Aktualisieren des Workspaces' };
  }
}

// Workspace archivieren
export async function archiveWorkspace(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: session.user.id,
      },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace nicht gefunden' };
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { isArchived: true },
    });

    return { success: true };
  } catch (error) {
    console.error('Fehler beim Archivieren des Workspaces:', error);
    return { success: false, error: 'Fehler beim Archivieren des Workspaces' };
  }
}

// Workspace löschen (nur wenn leer)
export async function deleteWorkspace(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: session.user.id,
      },
      include: {
        results: true,
        chats: true,
      },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace nicht gefunden' };
    }

    // Prüfe ob Workspace leer ist
    if (workspace.results.length > 0 || workspace.chats.length > 0) {
      return {
        success: false,
        error: 'Workspace kann nicht gelöscht werden, da er noch Inhalte enthält. Bitte zuerst archivieren.',
      };
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { success: true };
  } catch (error) {
    console.error('Fehler beim Löschen des Workspaces:', error);
    return { success: false, error: 'Fehler beim Löschen des Workspaces' };
  }
}

// Result speichern
export async function saveResult(
  toolId: string,
  toolName: string,
  content: string,
  workspaceId?: string,
  title?: string,
  metadata?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Wenn kein Workspace angegeben, verwende Default-Workspace
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: {
          userId: session.user.id,
          name: 'Allgemein',
          isArchived: false,
        },
      });

      if (!defaultWorkspace) {
        // Fallback: Erstelle Default-Workspace falls nicht vorhanden
        const created = await createDefaultWorkspace(session.user.id);
        if (created.success && created.workspace) {
          targetWorkspaceId = created.workspace.id;
        }
      } else {
        targetWorkspaceId = defaultWorkspace.id;
      }
    }

    const result = await prisma.result.create({
      data: {
        userId: session.user.id,
        workspaceId: targetWorkspaceId,
        toolId,
        toolName,
        content,
        title,
        metadata,
      },
    });

    return { success: true, result };
  } catch (error) {
    console.error('Fehler beim Speichern des Results:', error);
    return { success: false, error: 'Fehler beim Speichern des Results' };
  }
}

// Einzelnes Result nach ID abrufen
export async function getResultById(resultId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const result = await prisma.result.findFirst({
      where: {
        id: resultId,
        userId: session.user.id,
      },
    });

    return result;
  } catch (error) {
    console.error('[WORKSPACE] Error fetching result by ID:', error);
    return null;
  }
}

// Recent Results abrufen (ohne Workspace-Filter)
export async function getWorkspaceResults(workspaceId?: string, limit: number = 6) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const results = await prisma.result.findMany({
      where: {
        userId: session.user.id,
        // workspaceId ist jetzt optional - wenn nicht angegeben, alle Results
        ...(workspaceId && { workspaceId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return { success: true, results };
  } catch (error) {
    console.error('Fehler beim Abrufen der Results:', error);
    return { success: false, error: 'Fehler beim Laden der Results' };
  }
}

// Result zu anderem Workspace verschieben
export async function moveResult(resultId: string, targetWorkspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const result = await prisma.result.findFirst({
      where: {
        id: resultId,
        userId: session.user.id,
      },
    });

    if (!result) {
      return { success: false, error: 'Result nicht gefunden' };
    }

    await prisma.result.update({
      where: { id: resultId },
      data: { workspaceId: targetWorkspaceId },
    });

    return { success: true };
  } catch (error) {
    console.error('Fehler beim Verschieben des Results:', error);
    return { success: false, error: 'Fehler beim Verschieben des Results' };
  }
}

// Result löschen
export async function deleteResult(resultId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Prüfe ob Result dem User gehört
    const result = await prisma.result.findFirst({
      where: {
        id: resultId,
        userId: session.user.id,
      },
    });

    if (!result) {
      return { success: false, error: 'Result nicht gefunden' };
    }

    await prisma.result.delete({
      where: { id: resultId },
    });

    return { success: true };
  } catch (error) {
    console.error('Fehler beim Löschen des Results:', error);
    return { success: false, error: 'Fehler beim Löschen des Results' };
  }
}

// Alte Results automatisch löschen (30 Tage)
export async function cleanupOldResults() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.result.deleteMany({
      where: {
        userId: session.user.id,
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error('Fehler beim Cleanup alter Results:', error);
    return { success: false, error: 'Fehler beim Cleanup' };
  }
}
