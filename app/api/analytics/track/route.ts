import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { trackActivity, trackFeatureUsage } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, page, feature, category, duration, success, metadata } = body;

    // Tracke Aktivität
    if (action) {
      await trackActivity(session.user.id, action, {
        page,
        feature,
        metadata,
      });
    }

    // Tracke Feature-Nutzung
    if (feature) {
      await trackFeatureUsage(session.user.id, feature, {
        category,
        duration,
        success,
        metadata,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ANALYTICS] Tracking-Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Tracking' },
      { status: 500 }
    );
  }
}
