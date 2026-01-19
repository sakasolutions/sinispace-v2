'use server';

import { signOut, signIn } from '@/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { clearRevokedUser } from '@/lib/session-cache';

const prisma = new PrismaClient();

// User registrieren
export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    throw new Error('Email und Passwort sind erforderlich.');
  }

  try {
    // Prüfen ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Ein Benutzer mit dieser E-Mail existiert bereits.');
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User erstellen
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    await prisma.$disconnect();
  } catch (error) {
    await prisma.$disconnect();
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Fehler beim Registrieren des Benutzers.');
  }
}

// User einloggen
export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email und Passwort sind erforderlich.' };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
      redirect: false, // Wichtig: Kein automatischer Redirect, damit wir Fehler abfangen können
    });
    // Session wird automatisch in DB gespeichert via signIn-Callback in auth.ts
    return { success: true };
  } catch (error: any) {
    // NextAuth wirft verschiedene Fehlertypen - alle abfangen
    console.error('Login error:', error);
    
    // Prüfe auf verschiedene Fehlertypen
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Spezifische Fehlermeldungen aus auth.ts
      if (errorMessage.includes('benutzer nicht gefunden') || errorMessage.includes('user not found')) {
        return { success: false, error: 'Kein Benutzer mit dieser E-Mail gefunden.' };
      }
      if (errorMessage.includes('falsches passwort') || errorMessage.includes('wrong password') || errorMessage.includes('invalid password')) {
        return { success: false, error: 'Falsches Passwort. Bitte versuche es erneut.' };
      }
      
      // NextAuth spezifische Fehler
      if (errorMessage.includes('callbackrouteerror') || errorMessage.includes('callback')) {
        return { success: false, error: 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.' };
      }
      if (errorMessage.includes('credentials') || errorMessage.includes('authorize')) {
        return { success: false, error: 'Ungültige Anmeldedaten. Bitte versuche es erneut.' };
      }
      
      // Fallback: Zeige die Fehlermeldung, aber ohne technische Details
      if (errorMessage.includes('http://') || errorMessage.includes('https://')) {
        return { success: false, error: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.' };
      }
      
      return { success: false, error: error.message };
    }
    
    // Fallback für unbekannte Fehlertypen
    return { success: false, error: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.' };
  }
}

export async function signOutAction() {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  const userId = session?.user?.id;
  
  // WICHTIG: Erst Sessions löschen, DANACH signOut (sonst ist Session-Cookie weg)
  if (userId) {
    try {
      // Alle Sessions des Users aus DB löschen (VOR signOut, damit wir noch Zugriff haben)
      const result = await prisma.session.deleteMany({
        where: { userId },
      });
      console.log(`[signOutAction] ✅ ${result.count} Session(s) gelöscht für User: ${userId}`);
    } catch (error) {
      // Fehler loggen, aber trotzdem fortfahren
      console.error('[signOutAction] ⚠️ Fehler beim Löschen der Sessions:', error);
    }
  }
  
  // User ausloggen (Session-Cookie löschen)
  // WICHTIG: redirect: false, damit wir danach manuell weiterleiten können
  // Nutze den statischen Import von oben
  await signOut({ redirect: false });
  
  // Manueller Redirect nach erfolgreichem Löschen
  const { redirect } = await import('next/navigation');
  redirect('/login');
}

// Konto endgültig löschen
export async function deleteAccount() {
  const { auth } = await import('@/auth');
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  const userId = session.user.id;

  try {
    // 1. Alle Sessions des Users löschen (bevor User gelöscht wird)
    await prisma.session.deleteMany({
      where: { userId },
    });

    // 2. User löschen - alle zugehörigen Daten werden durch onDelete: Cascade automatisch gelöscht
    // (Accounts, Chats, Messages)
    await prisma.user.delete({
      where: { id: userId },
    });

    // 3. User ausloggen (Session-Cookie löschen)
    await signOut({ redirect: false });

    return { success: true, redirect: '/login' };
  } catch (error) {
    console.error('Error deleting account:', error);
    // Versuche trotzdem auszuloggen
    try {
      await signOut({ redirect: false });
    } catch (signOutError) {
      console.error('Error signing out:', signOutError);
    }
    return { success: false, error: 'Fehler beim Löschen des Kontos' };
  }
}
