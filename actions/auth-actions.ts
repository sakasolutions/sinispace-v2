'use server';

import { signOut, signIn } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '@/lib/email';
import crypto from 'crypto';

// User registrieren
export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    console.error('[REGISTER] ❌ Email oder Passwort fehlt');
    throw new Error('Email und Passwort sind erforderlich.');
  }

  try {
    console.log(`[REGISTER] 🔍 Prüfe ob User existiert: ${email}`);
    
    // Prüfen ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error(`[REGISTER] ❌ User existiert bereits: ${email}`);
      throw new Error('Ein Benutzer mit dieser E-Mail existiert bereits.');
    }

    console.log(`[REGISTER] 🔐 Hashe Passwort für: ${email}`);
    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`[REGISTER] ➕ Erstelle neuen User: ${email}`);
    // User erstellen
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    console.log(`[REGISTER] ✅ User erfolgreich erstellt: ${newUser.id}`);
    
    // WICHTIG: NICHT disconnecten - Prisma Client wird wiederverwendet
    // await prisma.$disconnect();
  } catch (error) {
    console.error('[REGISTER] ❌ Fehler beim Registrieren:', error);
    
    // WICHTIG: NICHT disconnecten bei Fehler
    // await prisma.$disconnect();
    
    if (error instanceof Error) {
      // Prisma-Fehler erkennen
      if (error.message.includes('Prisma') || error.message.includes('database') || error.message.includes('connection')) {
        console.error('[REGISTER] ❌ Datenbank-Fehler erkannt');
        throw new Error('Datenbank-Verbindungsfehler. Bitte versuche es später erneut.');
      }
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

// Passwort ändern (für eingeloggte User)
export async function changePassword(prevState: any, formData: FormData) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert. Bitte melde dich an.' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validierung
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: 'Bitte fülle alle Felder aus.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Die neuen Passwörter stimmen nicht überein.' };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.' };
  }

  try {
    // User mit Passwort laden
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, email: true },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Benutzer nicht gefunden oder kein Passwort gesetzt.' };
    }

    // Aktuelles Passwort prüfen
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return { success: false, error: 'Das aktuelle Passwort ist falsch.' };
    }

    // Neues Passwort hashen
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Passwort aktualisieren
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    console.log(`[CHANGE_PASSWORD] ✅ Passwort geändert für User: ${session.user.id}`);

    // Bestätigungs-E-Mail senden (optional, nicht kritisch)
    if (user.email) {
      try {
        await sendPasswordChangedEmail(user.email);
      } catch (emailError) {
        console.error('[CHANGE_PASSWORD] ⚠️ Fehler beim Senden der Bestätigungs-E-Mail:', emailError);
        // Nicht werfen - E-Mail ist nicht kritisch
      }
    }

    return { success: true, message: 'Passwort erfolgreich geändert.' };
  } catch (error) {
    console.error('[CHANGE_PASSWORD] ❌ Fehler:', error);
    return { success: false, error: 'Fehler beim Ändern des Passworts. Bitte versuche es erneut.' };
  }
}

// Passwort-Reset anfordern (für nicht eingeloggte User)
export async function requestPasswordReset(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { success: false, error: 'Bitte gib deine E-Mail-Adresse ein.' };
  }

  // Rate Limiting: Prüfe ob in letzter Stunde bereits ein Request kam
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await prisma.passwordResetToken.count({
    where: {
      user: { email },
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentRequests >= 3) {
    // Keine Info geben, ob Account existiert (Sicherheit)
    return { success: true, message: 'Falls ein Account mit dieser E-Mail existiert, wurde eine E-Mail gesendet.' };
  }

  try {
    // User suchen (ohne zu verraten, ob er existiert)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Wenn User nicht existiert, trotzdem "Erfolg" zurückgeben (Sicherheit)
    if (!user) {
      console.log(`[REQUEST_PASSWORD_RESET] ⚠️ User nicht gefunden: ${email} (keine Info an User)`);
      return { success: true, message: 'Falls ein Account mit dieser E-Mail existiert, wurde eine E-Mail gesendet.' };
    }

    // Alte, nicht verwendete Tokens löschen
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Neuen Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 Stunde gültig

    // Token in DB speichern
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires,
      },
    });

    console.log(`[REQUEST_PASSWORD_RESET] ✅ Token erstellt für User: ${user.id}`);

    // E-Mail senden
    try {
      await sendPasswordResetEmail(user.email!, token);
      console.log(`[REQUEST_PASSWORD_RESET] ✅ E-Mail gesendet an: ${user.email}`);
    } catch (emailError) {
      console.error('[REQUEST_PASSWORD_RESET] ❌ Fehler beim Senden der E-Mail:', emailError);
      // Token löschen, wenn E-Mail nicht gesendet werden konnte
      await prisma.passwordResetToken.deleteMany({
        where: { token },
      });
      return { success: false, error: 'Fehler beim Senden der E-Mail. Bitte versuche es später erneut.' };
    }

    return { success: true, message: 'Falls ein Account mit dieser E-Mail existiert, wurde eine E-Mail gesendet.' };
  } catch (error) {
    console.error('[REQUEST_PASSWORD_RESET] ❌ Fehler:', error);
    return { success: false, error: 'Fehler beim Anfordern des Passwort-Resets. Bitte versuche es später erneut.' };
  }
}

// Passwort zurücksetzen (mit Token)
export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token || !newPassword || !confirmPassword) {
    return { success: false, error: 'Bitte fülle alle Felder aus.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Die Passwörter stimmen nicht überein.' };
  }

  try {
    // Token suchen
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!resetToken) {
      return { success: false, error: 'Ungültiger oder abgelaufener Token.' };
    }

    // Prüfen ob Token bereits verwendet wurde
    if (resetToken.used) {
      return { success: false, error: 'Dieser Token wurde bereits verwendet.' };
    }

    // Prüfen ob Token abgelaufen ist
    if (resetToken.expires < new Date()) {
      // Token löschen
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return { success: false, error: 'Dieser Token ist abgelaufen. Bitte fordere einen neuen an.' };
    }

    // Neues Passwort hashen
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Passwort aktualisieren
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Token als verwendet markieren
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    console.log(`[RESET_PASSWORD] ✅ Passwort zurückgesetzt für User: ${resetToken.userId}`);

    // Bestätigungs-E-Mail senden
    if (resetToken.user.email) {
      try {
        await sendPasswordChangedEmail(resetToken.user.email);
      } catch (emailError) {
        console.error('[RESET_PASSWORD] ⚠️ Fehler beim Senden der Bestätigungs-E-Mail:', emailError);
        // Nicht werfen - E-Mail ist nicht kritisch
      }
    }

    return { success: true, message: 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.' };
  } catch (error) {
    console.error('[RESET_PASSWORD] ❌ Fehler:', error);
    return { success: false, error: 'Fehler beim Zurücksetzen des Passworts. Bitte versuche es erneut.' };
  }
}
