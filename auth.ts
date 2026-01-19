import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Erlaube sinispace.app als vertrauenswürdige Domain
  session: { strategy: 'jwt' }, // WICHTIG: Bei Credentials müssen wir JWT nutzen
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        
        // User suchen
        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Prüfen ob User existiert und ein Passwort hat
        if (!user || !user.password) {
          throw new Error('Benutzer nicht gefunden.');
        }

        // Passwort vergleichen
        const isCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isCorrect) {
          throw new Error('Falsches Passwort.');
        }

        return user;
      },
    }),
  ],
  pages: {
    signIn: '/login', // Eigene Login-Seite (bauen wir gleich)
  },
  callbacks: {
    async session({ session, token }) {
      // WICHTIG: Wenn userId (sub) fehlt im Token, Session ungültig machen
      if (!token.sub) {
        // Session wurde revoked → ungültig machen
        // Setze session.user explizit auf null (nicht undefined), damit Middleware korrekt erkennt
        // NextAuth behandelt null besser als undefined für ungültige Sessions
        return {
          ...session,
          user: null, // WICHTIG: user auf null setzen → req.auth?.user wird null → req.auth?.user?.id wird undefined
        } as any;
      }
      
      // WICHTIG: Session-Validation hier (nicht im JWT-Callback!)
      // Der session() Callback läuft nur im Server Runtime, kann also Prisma nutzen
      // Der jwt() Callback läuft auch im Edge Runtime (Middleware) → KEIN Prisma möglich
      // Prüfe ob der User noch eine aktive Session hat (nur eine Session pro User erlaubt)
      try {
        const userId = token.sub as string;
        
        // Zuerst: Lösche alle abgelaufenen Sessions (Cleanup)
        await prisma.session.deleteMany({
          where: {
            userId: userId,
            expires: { lte: new Date() },
          },
        });
        
        // Prüfe ob noch eine aktive Session existiert
        const activeSession = await prisma.session.findFirst({
          where: {
            userId: userId,
            expires: { gt: new Date() },
          },
        });
        
        // WICHTIG: Sicherstellen, dass wirklich nur EINE Session existiert
        // Falls durch Race Condition mehrere Sessions erstellt wurden, lösche alle außer der neuesten
        if (activeSession) {
          const allSessions = await prisma.session.findMany({
            where: {
              userId: userId,
              expires: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });
          
          // Wenn mehr als eine Session existiert, lösche alle außer der neuesten
          if (allSessions.length > 1) {
            const sessionsToDelete = allSessions.slice(1); // Alle außer der ersten (neuesten)
            await prisma.session.deleteMany({
              where: {
                id: { in: sessionsToDelete.map(s => s.id) },
              },
            });
            console.log(`[session callback] ⚠️ ${sessionsToDelete.length} zusätzliche Session(s) gelöscht für User: ${userId}`);
          }
        }
        
        // Wenn keine aktive Session existiert, Session ungültig machen
        // (z.B. wenn User sich auf anderem Gerät eingeloggt hat → alte Session gelöscht)
        if (!activeSession) {
          // WICHTIG: user auf null setzen → Middleware erkennt ungültige Session
          // und löscht automatisch die Cookies
          return {
            ...session,
            user: null, // Session ungültig → user auf null setzen
          } as any;
        }
      } catch (error) {
        // Bei DB-Fehlern: Session ungültig machen (Sicherheitsprinzip)
        console.error('Error checking session in session callback:', error);
        return {
          ...session,
          user: null,
        } as any;
      }
      
      // Session existiert und ist gültig → user.id setzen
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      
      return session;
    },
    async jwt({ token, user, trigger }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33892122-4b78-4cba-bba4-a59e8a7bb458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:jwt:entry',message:'JWT callback entered',data:{hasUser:!!user,hasTokenSub:!!token.sub,trigger},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // WICHTIG: JWT-Callback läuft auch im Edge Runtime (z.B. Middleware)
      // Prisma funktioniert NICHT im Edge Runtime → KEINE DB-Queries hier!
      
      // Beim ersten Login: Nur userId speichern, KEINE sessionId hier
      // Die sessionId wird NICHT im JWT-Token gespeichert (Edge Runtime Problem)
      // Stattdessen: Session-Validation im session() Callback basiert auf userId
      if (user) {
        token.sub = user.id;
        // WICHTIG: KEINE Prisma-Aufrufe hier! (Edge Runtime inkompatibel)
        // sessionId wird NICHT im Token gespeichert
        // Die Session-Validation erfolgt im session() Callback basierend auf userId
        // Setze invalidated Flag zurück beim neuen Login
        delete token.invalidated;
      }
      
      // WICHTIG: KEINE Session-Validation hier im JWT-Callback!
      // Prisma funktioniert nicht im Edge Runtime (Middleware nutzt JWT-Callback)
      // Die Validation erfolgt im session() Callback (nur Server Runtime)
      // Wenn das Token invalidiert wurde (durch session() Callback), entferne sub
      // Das führt dazu, dass die Middleware das Token als ungültig erkennt
      
      return token;
    },
    // Session in DB speichern nach erfolgreichem Login
    async signIn({ user, account }) {
      if (account?.provider === 'credentials' && user?.id) {
        try {
          // WICHTIG: Nur eine Session pro User erlauben
          // Lösche ALLE Sessions (auch abgelaufene) BEVOR neue erstellt wird
          // Das verhindert, dass mehrere Geräte gleichzeitig eingeloggt sind
          const deleteResult = await prisma.session.deleteMany({
            where: { userId: user.id },
          });
          console.log(`[signIn] ✅ ${deleteResult.count} alte Session(s) gelöscht für User: ${user.id}`);
          
          // Erstelle neue Session (nur eine pro User)
          const sessionToken = crypto.randomUUID();
          const expires = new Date();
          expires.setDate(expires.getDate() + 30); // 30 Tage

          const dbSession = await prisma.session.create({
            data: {
              sessionToken: sessionToken,
              userId: user.id,
              expires: expires,
            },
          });
          
          console.log(`[signIn] ✅ Neue Session erstellt: ${dbSession.id} für User: ${user.id}`);
          
          // WICHTIG: Update lastLoginAt im User (für UI-Anzeige)
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (error) {
          // Fehler ignorieren (nicht kritisch für Login)
          console.error('Error creating session in DB:', error);
        }
      }
      return true;
    }
  }
});



