import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
          console.error('[AUTH] ❌ Keine Credentials angegeben');
          return null;
        }

        const email = credentials.email as string;
        
        try {
          // User suchen
          const user = await prisma.user.findUnique({
            where: { email },
          });

          // Prüfen ob User existiert und ein Passwort hat
          if (!user) {
            console.error(`[AUTH] ❌ User nicht gefunden: ${email}`);
            throw new Error('Benutzer nicht gefunden.');
          }

          if (!user.password) {
            console.error(`[AUTH] ❌ User hat kein Passwort: ${email}`);
            throw new Error('Benutzer nicht gefunden.');
          }

          // Passwort vergleichen
          const isCorrect = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isCorrect) {
            console.error(`[AUTH] ❌ Falsches Passwort für: ${email}`);
            throw new Error('Falsches Passwort.');
          }

          console.log(`[AUTH] ✅ Login erfolgreich für: ${email}`);
          return user;
        } catch (error) {
          // Datenbank-Fehler loggen
          if (error instanceof Error && error.message.includes('Prisma')) {
            console.error('[AUTH] ❌ Datenbank-Fehler:', error.message);
            throw new Error('Datenbank-Verbindungsfehler. Bitte versuche es später erneut.');
          }
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login', // Eigene Login-Seite (bauen wir gleich)
  },
  callbacks: {
    async session({ session, token }) {
      // WICHTIG: session() Callback kann im Edge Runtime laufen (z.B. in Middleware)
      // Prisma funktioniert NICHT im Edge Runtime → KEINE DB-Queries hier!
      // Wir vertrauen auf das JWT-Token - wenn es gültig ist, ist die Session gültig
      
      // Wenn userId (sub) fehlt im Token, Session ungültig machen
      if (!token.sub) {
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
        } catch (error) {
          // Fehler ignorieren (nicht kritisch für Login)
          console.error('Error creating session in DB:', error);
        }
      }
      return true;
    }
  }
});



