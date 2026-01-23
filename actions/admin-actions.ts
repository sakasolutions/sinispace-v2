'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { sanitizeName, sanitizeEmail } from '@/lib/sanitize';

// Sicherheits-Check: Nur Admin darf diese Actions ausführen
async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    console.log(`[ADMIN_ACTION] ❌ Keine Session`);
    redirect('/');
  }

  // Prüfe Admin-Flag in DB (sicherer als E-Mail-Check)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    console.log(`[ADMIN_ACTION] ❌ Unauthorized access attempt from: ${session?.user?.email} (ID: ${session.user.id})`);
    redirect('/');
  }

  return session;
}

// User aktualisieren
export async function updateUser(prevState: any, formData: FormData) {
  await requireAdmin();

  const userId = formData.get('userId') as string;
  let name = formData.get('name') as string;
  let email = formData.get('email') as string;
  const subscriptionEnd = formData.get('subscriptionEnd') as string;

  if (!userId) {
    return { success: false, error: 'User ID fehlt.' };
  }

  try {
    const updateData: any = {};
    
    if (name !== null && name !== undefined) {
      // Name sanitizen (XSS-Schutz)
      if (name && name.trim()) {
        updateData.name = sanitizeName(name, 50) || null;
      } else {
        updateData.name = null;
      }
    }
    
    if (email) {
      // Email sanitizen
      email = sanitizeEmail(email);
      
      if (!email || email.length === 0) {
        return { success: false, error: 'Ungültige E-Mail-Adresse.' };
      }
      
      // Prüfe ob Email bereits existiert (außer für diesen User)
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser && existingUser.id !== userId) {
        return { success: false, error: 'Diese E-Mail-Adresse ist bereits vergeben.' };
      }
      
      updateData.email = email;
    }
    
    if (subscriptionEnd) {
      // Parse Datum (Format: YYYY-MM-DD)
      const date = new Date(subscriptionEnd);
      if (isNaN(date.getTime())) {
        return { success: false, error: 'Ungültiges Datum.' };
      }
      updateData.subscriptionEnd = date;
    } else if (subscriptionEnd === '') {
      // Leer = Premium entfernen
      updateData.subscriptionEnd = null;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log(`[ADMIN] ✅ User aktualisiert: ${userId}`);
    return { success: true, message: 'User erfolgreich aktualisiert.' };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Aktualisieren:', error);
    return { success: false, error: error.message || 'Fehler beim Aktualisieren des Users.' };
  }
}

// User Passwort zurücksetzen
export async function resetUserPassword(prevState: any, formData: FormData) {
  await requireAdmin();

  const userId = formData.get('userId') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!userId || !newPassword) {
    return { success: false, error: 'User ID und neues Passwort sind erforderlich.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    console.log(`[ADMIN] ✅ Passwort zurückgesetzt für User: ${userId}`);
    return { success: true, message: 'Passwort erfolgreich zurückgesetzt.' };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Zurücksetzen des Passworts:', error);
    return { success: false, error: 'Fehler beim Zurücksetzen des Passworts.' };
  }
}

// User löschen
export async function deleteUser(prevState: any, formData: FormData) {
  await requireAdmin();

  const userId = formData.get('userId') as string;

  if (!userId) {
    return { success: false, error: 'User ID fehlt.' };
  }

  try {
    // Prüfe ob es der Admin selbst ist
    const session = await auth();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      return { success: false, error: 'Admin-Account kann nicht gelöscht werden.' };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`[ADMIN] ✅ User gelöscht: ${userId}`);
    return { success: true, message: 'User erfolgreich gelöscht.' };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Löschen:', error);
    return { success: false, error: 'Fehler beim Löschen des Users.' };
  }
}

// Premium für User setzen/entfernen
export async function setUserPremium(prevState: any, formData: FormData) {
  await requireAdmin();

  const userId = formData.get('userId') as string;
  const days = parseInt(formData.get('days') as string || '30');

  if (!userId || isNaN(days)) {
    return { success: false, error: 'User ID und Anzahl Tage sind erforderlich.' };
  }

  try {
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + days);

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionEnd },
    });

    console.log(`[ADMIN] ✅ Premium gesetzt für User: ${userId} (${days} Tage)`);
    return { success: true, message: `Premium für ${days} Tage gesetzt.` };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Setzen von Premium:', error);
    return { success: false, error: 'Fehler beim Setzen von Premium.' };
  }
}

// Premium entfernen
export async function removeUserPremium(prevState: any, formData: FormData) {
  await requireAdmin();

  const userId = formData.get('userId') as string;

  if (!userId) {
    return { success: false, error: 'User ID fehlt.' };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionEnd: null },
    });

    console.log(`[ADMIN] ✅ Premium entfernt für User: ${userId}`);
    return { success: true, message: 'Premium erfolgreich entfernt.' };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Entfernen von Premium:', error);
    return { success: false, error: 'Fehler beim Entfernen von Premium.' };
  }
}

// Chat Messages für Admin abrufen
export async function getChatMessages(chatId: string) {
  await requireAdmin();

  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return { success: true, messages };
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Abrufen der Messages:', error);
    return { success: false, error: 'Fehler beim Abrufen der Messages.' };
  }
}

// Einmalig: Admin-Flag basierend auf E-Mail setzen (Migration-Helper)
// WICHTIG: Diese Funktion sollte nur einmal aufgerufen werden, um bestehende Admin-User zu migrieren
export async function migrateAdminFlag() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // Nur wenn eingeloggt und E-Mail stimmt (einmalige Migration)
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return { success: false, error: 'Nicht autorisiert für Migration.' };
  }

  try {
    // Setze Admin-Flag für User mit Admin-E-Mail
    const result = await prisma.user.updateMany({
      where: {
        email: adminEmail,
        isAdmin: false, // Nur wenn noch nicht gesetzt
      },
      data: {
        isAdmin: true,
      },
    });

    console.log(`[ADMIN_MIGRATION] ✅ Admin-Flag gesetzt für ${result.count} User(s)`);
    return { success: true, message: `Admin-Flag für ${result.count} User(s) gesetzt.` };
  } catch (error: any) {
    console.error('[ADMIN_MIGRATION] ❌ Fehler:', error);
    return { success: false, error: 'Fehler beim Setzen des Admin-Flags.' };
  }
}
