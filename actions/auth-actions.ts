'use server';

import { signOut, signIn } from '@/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
    });
    // Session wird automatisch in DB gespeichert via signIn-Callback in auth.ts
    return { success: true };
  } catch (error) {
    // NextAuth wirft spezifische Fehler - diese abfangen
    if (error instanceof Error) {
      // Spezifische Fehlermeldungen aus auth.ts
      if (error.message === 'Benutzer nicht gefunden.') {
        return { success: false, error: 'Kein Benutzer mit dieser E-Mail gefunden.' };
      }
      if (error.message === 'Falsches Passwort.') {
        return { success: false, error: 'Falsches Passwort. Bitte versuche es erneut.' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.' };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
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
