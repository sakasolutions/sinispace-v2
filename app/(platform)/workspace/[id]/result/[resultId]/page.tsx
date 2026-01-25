import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ResultDetailClient } from './result-detail-client';

export default async function ResultDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; resultId: string }> 
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  try {
    const { id: workspaceId, resultId } = await params;

    // Prüfe ob Workspace dem User gehört
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: session.user.id,
        isArchived: false,
      },
    });

    if (!workspace) {
      redirect('/dashboard');
    }

    // Lade Result
    const result = await prisma.result.findFirst({
      where: {
        id: resultId,
        userId: session.user.id,
        workspaceId: workspaceId,
      },
    });

    if (!result) {
      redirect(`/workspace/${workspaceId}`);
    }

    return (
      <ResultDetailClient
        workspace={workspace}
        result={result}
      />
    );
  } catch (error: any) {
    console.error('[RESULT PAGE] Fehler:', error);
    redirect('/dashboard');
  }
}
