import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserWorkspaces, getWorkspaceResults } from '@/actions/workspace-actions';
import { prisma } from '@/lib/prisma';
import { WorkspaceDashboardClient } from './workspace-dashboard-client';

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  try {
    const { id } = await params;

    // Prüfe ob Workspace dem User gehört
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        userId: session.user.id,
        isArchived: false,
      },
    });

    if (!workspace) {
      redirect('/dashboard');
    }

    // Lade Workspaces und Results
    const workspacesResult = await getUserWorkspaces();
    const resultsResult = await getWorkspaceResults(id, 6);

    return (
      <WorkspaceDashboardClient
        workspace={workspace}
        workspaces={workspacesResult.success ? workspacesResult.workspaces || [] : []}
        recentResults={resultsResult.success ? resultsResult.results || [] : []}
      />
    );
  } catch (error: any) {
    console.error('[WORKSPACE PAGE] Fehler:', error);
    // Wenn Prisma-Model nicht existiert, leite zum Dashboard weiter
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('Unknown model')) {
      console.error('[WORKSPACE PAGE] Prisma Model nicht gefunden - Prisma Client muss neu generiert werden!');
      redirect('/dashboard');
    }
    // Andere Fehler: Weiterleiten
    throw error;
  }
}
