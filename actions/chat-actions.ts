'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

// Einen neuen Chat erstellen
export async function createChat(firstMessage: string) {
  const session = await auth();
  
  // WICHTIG: Auth-Check - Nur eingeloggte User können Chats erstellen
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Titel aus ersten 30 Zeichen der ersten Nachricht generieren (oder Standard-Titel)
  const title = firstMessage?.slice(0, 30).trim() || 'Neuer Chat';

  try {
    // Chat sofort in DB schreiben mit User-Bindung
    const chat = await prisma.chat.create({
      data: {
        userId: session.user.id, // WICHTIG: User-Bindung
        title: title,
      },
    });
    
    return { success: true, chatId: chat.id };
  } catch (error) {
    console.error('Error creating chat:', error);
    return { success: false, error: 'Fehler beim Erstellen des Chats' };
  }
}

// Alle Chats eines Users laden (für Sidebar) mit 30-Tage Cleanup
export async function getChats() {
  const session = await auth();
  
  // WICHTIG: Auth-Check - Nur eingeloggte User können Chats abrufen
  if (!session?.user?.id) {
    return [];
  }

  try {
    // 30-Tage Cleanup: Lösche alte Chats vor dem Abrufen
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await prisma.chat.deleteMany({
      where: {
        userId: session.user.id, // Nur Chats des aktuellen Users
        updatedAt: {
          lt: thirtyDaysAgo, // Älter als 30 Tage
        },
      },
    });

    // Chats abrufen - NUR für den aktuellen User
    const chats = await prisma.chat.findMany({
      where: {
        userId: session.user.id, // WICHTIG: User-Bindung
      },
      orderBy: {
        updatedAt: 'desc', // Neueste zuerst
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

// Einen einzelnen Chat inklusive Nachrichten laden
export async function getChat(chatId: string) {
  const session = await auth();
  
  // WICHTIG: Auth-Check
  if (!session?.user?.id) {
    redirect('/login');
  }

  try {
    // Chat laden - NUR wenn er dem User gehört
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id, // WICHTIG: User-Bindung & Sicherheit
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chat) {
      return null;
    }

    return {
      id: chat.id,
      title: chat.title,
      messages: chat.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    };
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

// Neue Nachricht in der DB speichern
export async function saveMessage(chatId: string, role: 'user' | 'assistant', content: string) {
  const session = await auth();
  
  // WICHTIG: Auth-Check
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Prüfen ob Chat existiert UND dem User gehört
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id, // WICHTIG: User-Bindung & Sicherheit
      },
    });

    if (!chat) {
      return { success: false, error: 'Chat nicht gefunden oder keine Berechtigung' };
    }

    // Nachricht speichern
    await prisma.message.create({
      data: {
        chatId: chatId,
        role: role,
        content: content,
      },
    });

    // Chat updatedAt aktualisieren (für Sortierung in Sidebar)
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving message:', error);
    return { success: false, error: 'Fehler beim Speichern der Nachricht' };
  }
}

// Chat-Titel aktualisieren (optional, falls User Titel ändern möchte)
export async function updateChatTitle(chatId: string, title: string) {
  const session = await auth();
  
  // WICHTIG: Auth-Check
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Titel aktualisieren - NUR wenn Chat dem User gehört
    const result = await prisma.chat.updateMany({
      where: {
        id: chatId,
        userId: session.user.id, // WICHTIG: User-Bindung & Sicherheit
      },
      data: {
        title: title.trim() || 'Unbenannter Chat',
      },
    });
    
    if (result.count === 0) {
      return { success: false, error: 'Chat nicht gefunden oder keine Berechtigung' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating chat title:', error);
    return { success: false, error: 'Fehler beim Aktualisieren des Titels' };
  }
}

// Chat endgültig löschen
export async function deleteChat(chatId: string) {
  const session = await auth();
  
  // WICHTIG: Auth-Check
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Prüfen ob Chat existiert UND dem User gehört
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id, // WICHTIG: User-Bindung & Sicherheit
      },
    });

    if (!chat) {
      return { success: false, error: 'Chat nicht gefunden oder keine Berechtigung' };
    }

    // Dokumente des Chats löschen (von OpenAI und DB)
    const { deleteChatDocuments } = await import('@/actions/document-actions');
    await deleteChatDocuments(chatId);

    // Chat löschen (Messages werden durch onDelete: Cascade automatisch gelöscht)
    await prisma.chat.delete({
      where: { id: chatId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting chat:', error);
    return { success: false, error: 'Fehler beim Löschen des Chats' };
  }
}

// Helfer-Chat erstellen und User-Eingabe + KI-Response speichern
export async function createHelperChat(
  helperType: 'email' | 'excel' | 'summarize' | 'translate' | 'polish' | 'tough-msg' | 'legal' | 'job-desc',
  userInput: string,
  aiResponse: string
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // Titel basierend auf Helper-Type
    const titles: Record<'email' | 'excel' | 'summarize' | 'translate' | 'polish' | 'tough-msg' | 'legal' | 'job-desc', string> = {
      email: 'E-Mail generiert',
      excel: 'Excel Formel generiert',
      summarize: 'Text zusammengefasst',
      translate: 'Text übersetzt',
      polish: 'Text aufpoliert',
      'tough-msg': 'Schwierige Nachricht formuliert',
      legal: 'Rechtstext erstellt',
      'job-desc': 'Stellenanzeige erstellt',
    };
    
    const title = titles[helperType] || 'Helfer Chat';
    const titleWithPreview = `${title}: ${userInput.slice(0, 20)}...`;

    // Chat erstellen
    const chat = await prisma.chat.create({
      data: {
        userId: session.user.id,
        title: titleWithPreview,
      },
    });

    // User-Eingabe speichern
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: userInput,
      },
    });

    // KI-Response speichern
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    return { success: true, chatId: chat.id };
  } catch (error) {
    console.error('Error creating helper chat:', error);
    return { success: false, error: 'Fehler beim Erstellen des Chats' };
  }
}

// Alte Chats automatisch löschen (für Cron-Job oder manuellen Aufruf)
export async function cleanupOldChats() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Zuerst alte Dokumente löschen
    const { cleanupOldDocuments } = await import('@/actions/document-actions');
    await cleanupOldDocuments();
    
    // Dann alte Chats löschen (Dokumente werden durch onDelete: Cascade automatisch gelöscht)
    const result = await prisma.chat.deleteMany({
      where: {
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
    
    console.log(`🧹 ${result.count} alte Chats gelöscht (älter als 30 Tage)`);
    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error('Error cleaning up old chats:', error);
    return { success: false, error: 'Fehler beim Löschen alter Chats' };
  }
}
