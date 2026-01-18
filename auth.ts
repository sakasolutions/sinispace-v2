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
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // Beim ersten Login: Session-ID aus DB im Token speichern
      if (user) {
        token.sub = user.id;
        
        // Finde die neueste Session für diesen User (gerade erstellt im signIn-Callback)
        // Diese Session-ID wird im JWT gespeichert, damit wir später prüfen können, ob sie noch existiert
        try {
          const latestSession = await prisma.session.findFirst({
            where: {
              userId: user.id,
              expires: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });
          
          if (latestSession) {
            // Speichere Session-ID im JWT-Token
            token.sessionId = latestSession.id;
          }
        } catch (error) {
          console.error('Error finding session for JWT:', error);
        }
      }
      
      // Bei jedem Request: Prüfe ob die DB-Session noch existiert
      // Wenn nicht, wird der Token ungültig und User wird ausgeloggt
      if (token.sessionId && token.sub) {
        try {
          const dbSession = await prisma.session.findFirst({
            where: {
              id: token.sessionId as string,
              userId: token.sub as string,
              expires: { gt: new Date() },
            },
          });
          
          // Wenn Session nicht existiert oder abgelaufen ist, Token ungültig machen
          if (!dbSession) {
            // Session wurde gelöscht (z.B. durch revokeSession) → User ausloggen
            throw new Error('Session revoked');
          }
        } catch (error) {
          // Session existiert nicht mehr → Token ungültig machen
          if (error instanceof Error && error.message === 'Session revoked') {
            throw error; // Wirft Fehler → User wird ausgeloggt
          }
          // Andere Fehler ignorieren (z.B. DB-Verbindungsprobleme)
          console.error('Error checking session in JWT callback:', error);
        }
      }
      
      return token;
    },
    // Session in DB speichern nach erfolgreichem Login
    async signIn({ user, account }) {
      if (account?.provider === 'credentials' && user?.id) {
        // Erstelle IMMER eine neue Session in DB für Session-Management
        // Jeder Login (auch in verschiedenen Browsern) bekommt eine eigene Session
        try {
          const sessionToken = crypto.randomUUID();
          const expires = new Date();
          expires.setDate(expires.getDate() + 30); // 30 Tage

          // Erstelle neue Session (jeder Login = neue Session)
          const dbSession = await prisma.session.create({
            data: {
              sessionToken: sessionToken,
              userId: user.id,
              expires: expires,
            },
          });
          
          // WICHTIG: Speichere die Session-ID im JWT-Token (wird im jwt-Callback gesetzt)
          // Das ermöglicht uns, zu prüfen, ob die Session noch existiert
          // Siehe jwt-Callback unten
        } catch (error) {
          // Fehler ignorieren (nicht kritisch für Login)
          console.error('Error creating session in DB:', error);
        }
      }
      return true;
    }
  }
});



