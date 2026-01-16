'use server';

import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { openai } from '@/lib/openai';

const prisma = new PrismaClient();

// Unterstützte Dateiformate (basierend auf OpenAI API)
const ALLOWED_MIME_TYPES = [
  // Dokumente
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // Text
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  // Code
  'text/x-python',
  'text/x-java',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-php',
  'text/x-ruby',
  'text/x-golang',
  'application/typescript',
  'application/x-sh',
  // Bilder
  'image/jpeg',
  'image/png',
  'image/gif',
  // Archive
  'application/zip',
  'application/x-tar',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (konservativ für PDFs)

// Dokument zu OpenAI hochladen und in DB speichern
export async function uploadDocument(chatId: string, formData: FormData) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'Keine Datei hochgeladen' };
  }

  // Validierung
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: `Dateityp nicht unterstützt: ${file.type}` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024} MB)` };
  }

  try {
    // Prüfen ob Chat existiert UND dem User gehört
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
      },
    });

    if (!chat) {
      return { success: false, error: 'Chat nicht gefunden oder keine Berechtigung' };
    }

    // Datei zu OpenAI hochladen
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type });
    
    // Für Bilder: Base64 speichern (für Vision API)
    let base64Data: string | null = null;
    if (file.type.startsWith('image/')) {
      base64Data = Buffer.from(fileBuffer).toString('base64');
    }
    
    const openaiFile = await openai.files.create({
      file: new File([fileBlob], file.name, { type: file.type }),
      purpose: 'assistants', // Für Chat/Assistants
    });

    // ExpiresAt berechnen (30 Tage ab jetzt)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Dokument in DB speichern
    const document = await prisma.document.create({
      data: {
        chatId: chatId,
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        openaiFileId: openaiFile.id,
        base64Data: base64Data, // Nur für Bilder
        expiresAt: expiresAt,
      },
    });

    return { 
      success: true, 
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      }
    };
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return { success: false, error: error.message || 'Fehler beim Hochladen der Datei' };
  }
}

// Dokumente eines Chats abrufen
export async function getChatDocuments(chatId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  try {
    // Prüfen ob Chat dem User gehört
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
      },
    });

    if (!chat) {
      return [];
    }

    const documents = await prisma.document.findMany({
      where: {
        chatId: chatId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        openaiFileId: true,
      },
    });

    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

// Dokument löschen (von OpenAI und DB)
export async function deleteDocument(documentId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Dokument finden und prüfen ob es dem User gehört
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!document) {
      return { success: false, error: 'Dokument nicht gefunden oder keine Berechtigung' };
    }

    // Von OpenAI löschen
    try {
      await openai.files.delete(document.openaiFileId);
    } catch (error: any) {
      // Wenn Datei bereits gelöscht wurde, ist das ok
      if (!error.message?.includes('No such file')) {
        console.error('Error deleting file from OpenAI:', error);
      }
    }

    // Aus DB löschen
    await prisma.document.delete({
      where: { id: documentId },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message || 'Fehler beim Löschen des Dokuments' };
  }
}

// Alle Dokumente eines Chats löschen (wird beim Chat-Löschen aufgerufen)
export async function deleteChatDocuments(chatId: string) {
  try {
    const documents = await prisma.document.findMany({
      where: { chatId: chatId },
      select: { openaiFileId: true },
    });

    // Von OpenAI löschen
    for (const doc of documents) {
      try {
        await openai.files.delete(doc.openaiFileId);
      } catch (error: any) {
        // Wenn Datei bereits gelöscht wurde, ist das ok
        if (!error.message?.includes('No such file')) {
          console.error('Error deleting file from OpenAI:', error);
        }
      }
    }

    // Aus DB löschen (onDelete: Cascade sollte das automatisch machen, aber sicherheitshalber)
    await prisma.document.deleteMany({
      where: { chatId: chatId },
    });

    return { success: true, deletedCount: documents.length };
  } catch (error: any) {
    console.error('Error deleting chat documents:', error);
    return { success: false, error: error.message || 'Fehler beim Löschen der Dokumente' };
  }
}

// Alte Dokumente automatisch löschen (älter als 30 Tage)
export async function cleanupOldDocuments() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const documents = await prisma.document.findMany({
      where: {
        expiresAt: {
          lt: thirtyDaysAgo,
        },
      },
      select: { openaiFileId: true },
    });

    // Von OpenAI löschen
    for (const doc of documents) {
      try {
        await openai.files.delete(doc.openaiFileId);
      } catch (error: any) {
        // Wenn Datei bereits gelöscht wurde, ist das ok
        if (!error.message?.includes('No such file')) {
          console.error('Error deleting file from OpenAI:', error);
        }
      }
    }

    // Aus DB löschen
    const result = await prisma.document.deleteMany({
      where: {
        expiresAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    
    console.log(`🧹 ${result.count} alte Dokumente gelöscht (älter als 30 Tage)`);
    return { success: true, deletedCount: result.count };
  } catch (error: any) {
    console.error('Error cleaning up old documents:', error);
    return { success: false, error: error.message || 'Fehler beim Löschen alter Dokumente' };
  }
}
