import { NextRequest, NextResponse } from 'next/server';
import { uploadDocument } from '@/actions/document-actions';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const file = formData.get('file') as File | null;

    if (!chatId || !file) {
      return NextResponse.json(
        { error: 'chatId und file sind erforderlich' },
        { status: 400 }
      );
    }

    const result = await uploadDocument(chatId, formData);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Hochladen' },
      { status: 500 }
    );
  }
}
