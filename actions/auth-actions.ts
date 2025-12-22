'use server';

import { signIn } from '@/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

// Wir initialisieren hier direkt den Client, um Import-Fehler zu vermeiden
const prisma = new PrismaClient();

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Bitte alle Felder ausfüllen.' };
  }

  try {
    // Prüfen ob User existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'Diese E-Mail wird bereits verwendet.' };
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User anlegen
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    return { error: 'Datenbankfehler bei der Registrierung.' };
  }

  // KORREKTUR: Kein Redirect mehr hier! Wir geben Erfolg zurück.
  // Das Frontend steuert jetzt die Weiterleitung.
  return { success: true };
}

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Ungültige Zugangsdaten.' };
        default:
          return { error: 'Etwas ist schiefgelaufen.' };
      }
    }
    throw error;
  }
}