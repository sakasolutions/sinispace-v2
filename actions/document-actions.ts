'use server';

import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { openai } from '@/lib/openai';

const prisma = new PrismaClient();

// Unterstützte Dateiformate (basierend auf OpenAI API)
// OpenAI File Search unterstützt: PDF, Word, Excel, PowerPoint, Text, Code
// OpenAI Vision API unterstützt: JPEG, PNG, GIF, WebP
const ALLOWED_MIME_TYPES = [
  // Dokumente (OpenAI File Search unterstützt)
  'application/pdf', // ✅ PDF - vollständig unterstützt
  'application/msword', // ✅ .doc - unterstützt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // ✅ .docx - unterstützt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // ✅ .xlsx - unterstützt
  'application/vnd.ms-excel', // .xls - unterstützt (ältere Excel-Formate)
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // ✅ .pptx - unterstützt
  'application/vnd.ms-powerpoint', // .ppt - unterstützt (ältere PowerPoint-Formate)
  // Text-Dateien (OpenAI File Search unterstützt)
  'text/plain', // ✅ .txt - unterstützt
  'text/markdown', // ✅ .md - unterstützt
  'text/html', // ✅ .html - unterstützt
  'text/css', // ✅ .css - unterstützt
  'text/javascript', // ✅ .js - unterstützt
  'application/json', // ✅ .json - unterstützt
  'application/xml', // ✅ .xml - unterstützt
  'text/xml', // ✅ .xml - unterstützt
  'text/x-tex', // ✅ .tex - unterstützt
  // Code-Dateien (OpenAI File Search unterstützt)
  'text/x-python', // ✅ .py - unterstützt
  'text/x-script.python', // ✅ .py - alternative MIME
  'text/x-java', // ✅ .java - unterstützt
  'text/x-c', // ✅ .c - unterstützt
  'text/x-c++', // ✅ .cpp - unterstützt
  'text/x-csharp', // ✅ .cs - unterstützt
  'text/x-php', // ✅ .php - unterstützt
  'text/x-ruby', // ✅ .rb - unterstützt
  'text/x-golang', // ✅ .go - unterstützt
  'application/typescript', // ✅ .ts - unterstützt
  'application/x-sh', // ✅ .sh - unterstützt
  'text/x-shellscript', // ✅ .sh - alternative MIME
  // Bilder (OpenAI Vision API unterstützt - Base64 wird gespeichert)
  'image/jpeg', // ✅ JPEG - Vision API
  'image/jpg', // ✅ JPEG - alternative MIME
  'image/png', // ✅ PNG - Vision API
  'image/gif', // ✅ GIF - Vision API
  'image/webp', // ✅ WebP - Vision API
  'image/svg+xml', // ⚠️ SVG - Vision API kann es lesen, aber nicht perfekt
  'image/bmp', // ⚠️ BMP - Vision API kann es lesen
  'image/tiff', // ⚠️ TIFF - Vision API kann es lesen
  // CSV (⚠️ WICHTIG: OpenAI File Search unterstützt CSV NICHT, aber erlauben wir es trotzdem für zukünftige Features)
  'text/csv', // ⚠️ CSV - File Search unterstützt es NICHT, aber erlauben für andere Zwecke
  'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm - Excel mit Makros
  // Archive (nur für Upload, nicht für AI-Analyse)
  'application/zip', // ⚠️ ZIP - nur Upload, keine AI-Analyse
  'application/x-tar', // ⚠️ TAR - nur Upload, keine AI-Analyse
  'application/x-rar-compressed', // ⚠️ RAR - nur Upload, keine AI-Analyse
  'application/x-7z-compressed', // ⚠️ 7Z - nur Upload, keine AI-Analyse
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
    // Fallback: Prüfe auch Dateiendung, falls MIME-Type nicht erkannt wurde
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.html', '.css', '.js', '.json', '.xml', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.ts', '.sh', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.csv'];
    
    if (!supportedExtensions.some(ext => fileName.endsWith(ext))) {
      return { 
        success: false, 
        error: `Dateityp nicht unterstützt: ${file.type || 'unbekannt'}. Unterstützte Formate: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt, .md, .html), Code (.py, .js, .ts, .java, etc.), Bilder (.jpg, .png, .gif, .webp)` 
      };
    }
    // Wenn Extension unterstützt wird, aber MIME-Type nicht erkannt, erlauben wir es trotzdem
    console.warn(`⚠️ MIME-Type nicht erkannt (${file.type}), aber Extension (${fileExtension}) ist unterstützt. Erlaube Upload.`);
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
    
    // Für Bilder: Base64 speichern (für Vision API) - NICHT zu OpenAI hochladen!
    // OpenAI akzeptiert PNG/JPG/etc. nicht für 'assistants' purpose
    let base64Data: string | null = null;
    let openaiFileId: string | null = null;
    
    if (file.type.startsWith('image/')) {
      // Bilder NICHT zu OpenAI hochladen - nur Base64 speichern
      try {
        base64Data = Buffer.from(fileBuffer).toString('base64');
        console.log('✅ Base64 für Bild erstellt:', file.name, file.size, 'bytes ->', base64Data.length, 'chars base64');
        console.log('ℹ️ Bild wird NICHT zu OpenAI hochgeladen (nicht nötig für Vision API)');
        // openaiFileId bleibt null für Bilder
      } catch (base64Error: any) {
        console.error('❌ Fehler beim Base64-Konvertieren:', base64Error);
        return { success: false, error: 'Fehler beim Verarbeiten des Bildes' };
      }
    } else {
      // Für Dokumente: Zu OpenAI hochladen
      try {
        const openaiFile = await openai.files.create({
          file: new File([fileBlob], file.name, { type: file.type }),
          purpose: 'assistants', // Für Chat/Assistants
        });
        openaiFileId = openaiFile.id;
        console.log('✅ Datei zu OpenAI hochgeladen:', openaiFile.id);
      } catch (uploadError: any) {
        console.error('❌ Fehler beim Hochladen zu OpenAI:', uploadError);
        return { success: false, error: uploadError.message || 'Fehler beim Hochladen der Datei zu OpenAI' };
      }
    }

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
        openaiFileId: openaiFileId, // null für Bilder, File-ID für Dokumente
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
        openaiFileId: document.openaiFileId, // null für Bilder, File-ID für Dokumente
        createdAt: document.createdAt,
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
