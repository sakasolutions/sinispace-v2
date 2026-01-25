import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { getUserWorkspaces } from '@/actions/workspace-actions';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Lade Workspaces (Results werden Client-seitig basierend auf aktuellem Workspace geladen)
  const workspacesResult = await getUserWorkspaces();
  const workspaces = workspacesResult.success ? workspacesResult.workspaces || [] : [];
  
  // Hole aktuellen Workspace aus localStorage (wird Client-seitig gesetzt)
  // Für Server: Nimm ersten Workspace als Fallback
  const currentWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;

  return (
    <DashboardClient 
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
    />
  );
}
