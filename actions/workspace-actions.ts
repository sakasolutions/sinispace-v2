'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';

// Default Workspace bei Registrierung erstellen
export async function createDefaultWorkspace(userId: string) {
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
    return { success: true, workspace: defaultWorkspace };
  } catch (error) {
    console.error('Fehler beim Erstellen des Default-Workspaces:', error);
    return { success: false, error: 'Fehler beim Erstellen des Workspaces' };
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

    return { success: true, workspace };
  } catch (error) {
    console.error('Fehler beim Erstellen des Workspaces:', error);
    return { success: false, error: 'Fehler beim Erstellen des Workspaces' };
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

// Recent Results eines Workspaces abrufen
export async function getWorkspaceResults(workspaceId: string, limit: number = 6) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    const results = await prisma.result.findMany({
      where: {
        workspaceId,
        userId: session.user.id,
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
