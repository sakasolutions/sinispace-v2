import { NextRequest, NextResponse } from 'next/server';
import { uploadDocument } from '@/actions/document-actions';

export async function POST(req: NextRequest) {
  try {
    console.log('📤 Upload-Request erhalten');
    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const file = formData.get('file') as File | null;

    console.log('📤 Upload-Daten:', { 
      chatId: chatId ? 'vorhanden' : 'fehlt', 
      file: file ? { name: file.name, size: file.size, type: file.type } : 'fehlt' 
    });

    if (!chatId || !file) {
      console.error('❌ Fehlende Parameter:', { chatId: !!chatId, file: !!file });
      return NextResponse.json(
        { success: false, error: 'chatId und file sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe Dateigröße (50 MB Limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      console.error('❌ Datei zu groß:', file.size, 'bytes');
      return NextResponse.json(
        { success: false, error: `Datei zu groß (max. ${MAX_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    console.log('📤 Starte Upload zu OpenAI...');
    const result = await uploadDocument(chatId, formData);
    console.log('📤 Upload-Ergebnis:', result.success ? 'erfolgreich' : 'fehlgeschlagen', result.error || '');

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    console.error('❌ Upload error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Fehler beim Hochladen' },
      { status: 500 }
    );
  }
}
