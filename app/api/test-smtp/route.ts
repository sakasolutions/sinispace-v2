import { NextResponse } from 'next/server';
import { testEmailConnection } from '@/lib/email';
import { auth } from '@/auth';

// Test-Endpoint für SMTP-Verbindung (nur für eingeloggte User)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const result = await testEmailConnection();
    
    // Prüfe auch ob Variablen gesetzt sind
    const config = {
      SMTP_HOST: process.env.SMTP_HOST ? '✅ Gesetzt' : '❌ Fehlt',
      SMTP_PORT: process.env.SMTP_PORT ? '✅ Gesetzt' : '❌ Fehlt',
      SMTP_USER: process.env.SMTP_USER ? '✅ Gesetzt' : '❌ Fehlt',
      SMTP_PASS: process.env.SMTP_PASS ? '✅ Gesetzt (versteckt)' : '❌ Fehlt',
      SMTP_FROM: process.env.SMTP_FROM ? '✅ Gesetzt' : '❌ Fehlt',
    };

    return NextResponse.json({
      success: result,
      config,
      message: result 
        ? 'SMTP-Verbindung erfolgreich!' 
        : 'SMTP-Verbindung fehlgeschlagen. Prüfe die Konfiguration.',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
