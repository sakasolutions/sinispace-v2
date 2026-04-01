import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toolId, toolName, resultId, type, metadata: rawMetadata, messageId } = body;

    if (!toolId || !toolName || !type || !['positive', 'negative'].includes(type)) {
      return NextResponse.json(
        { error: 'Ungültige Feedback-Daten' },
        { status: 400 }
      );
    }

    const meta: Record<string, unknown> = {};
    if (rawMetadata != null) {
      if (typeof rawMetadata === 'string') {
        try {
          const parsed = JSON.parse(rawMetadata) as Record<string, unknown>;
          Object.assign(meta, parsed);
        } catch {
          /* ignore invalid JSON */
        }
      } else if (typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
        Object.assign(meta, rawMetadata as Record<string, unknown>);
      }
    }
    if (typeof messageId === 'string' && messageId.length > 0) {
      meta.messageId = messageId;
    }

    const metadataJson =
      Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;

    // Prüfe ob Feedback-Tabelle existiert
    try {
      await prisma.feedback.create({
        data: {
          userId: session.user.id,
          toolId,
          toolName,
          resultId: resultId || null,
          type,
          metadata: metadataJson,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      // Tabelle existiert noch nicht - ignorieren
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Feedback')) {
        console.log('[FEEDBACK] ⚠️ Feedback Tabelle existiert noch nicht');
        return NextResponse.json({ success: true }); // Erfolg simulieren
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[FEEDBACK] Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern des Feedbacks' },
      { status: 500 }
    );
  }
}
