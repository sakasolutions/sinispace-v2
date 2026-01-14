import { NextResponse } from 'next/server';
import { cleanupOldChats } from '@/actions/chat-actions';
import { headers } from 'next/headers';

// Cron-Job Route für automatische Löschung alter Chats
// Kann von Vercel Cron, GitHub Actions, oder anderen Services aufgerufen werden
export async function GET(req: Request) {
  try {
    // Optional: Secret-Header prüfen für Sicherheit
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Wenn CRON_SECRET gesetzt ist, prüfe Authorization Header
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Alte Chats löschen
    const result = await cleanupOldChats();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} alte Chats gelöscht`,
        deletedCount: result.deletedCount,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Fehler beim Löschen' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST wird auch unterstützt (für manuelle Aufrufe)
export async function POST(req: Request) {
  return GET(req);
}
