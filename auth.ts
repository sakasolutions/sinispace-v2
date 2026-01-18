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
      // WICHTIG: Wenn sessionId oder sub fehlt im Token, Session ungültig machen
      if (!token.sessionId || !token.sub) {
        // Session wurde revoked → ungültig machen (token wurde im jwt-Callback gelöscht)
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
      // Prüfe ob die DB-Session noch existiert (wurde sie revoked?)
      try {
        const dbSession = await prisma.session.findFirst({
          where: {
            id: token.sessionId as string,
            userId: token.sub as string,
            expires: { gt: new Date() },
          },
        });
        
        // Wenn Session nicht existiert oder abgelaufen ist, Session ungültig machen
        if (!dbSession) {
          // Session wurde gelöscht (z.B. durch revokeSession) → Session ungültig machen
          return {
            ...session,
            user: null, // Session ungültig → user auf null setzen
          } as any;
        }
      } catch (error) {
        // Bei DB-Fehlern: Session ungültig machen (Sicherheitsprinzip)
        // Besser: User ausloggen als potenziell ungültige Session erlauben
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
      // WICHTIG: JWT-Callback läuft auch im Edge Runtime (z.B. Middleware)
      // Prisma funktioniert NICHT im Edge Runtime → KEINE DB-Queries hier!
      
      // Beim ersten Login: Session-ID aus DB im Token speichern
      // ABER: Nur wenn wir im Server Runtime sind (nicht im Edge Runtime)
      // Prisma-Prüfung: Nur wenn process.env.PRISMA_CLIENT_ENGINE_TYPE !== 'edge'
      if (user) {
        token.sub = user.id;
        
        // Finde die neueste Session für diesen User (gerade erstellt im signIn-Callback)
        // Diese Session-ID wird im JWT gespeichert, damit wir später prüfen können, ob sie noch existiert
        // WICHTIG: Nur im Server Runtime (nicht Edge) → Prisma verfügbar
        try {
          // Prüfe ob wir im Edge Runtime sind (dann Prisma nicht nutzen)
          // In Next.js: process.env.NEXT_RUNTIME === 'edge' bedeutet Edge Runtime
          // Alternativ: try-catch, wenn Prisma-Fehler → ignorieren (Edge Runtime)
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
        } catch (error: any) {
          // Im Edge Runtime wird hier ein Fehler kommen (Prisma nicht verfügbar)
          // Das ist OK → ignorieren, token.sessionId bleibt undefined
          // Die Session-Validation erfolgt dann im session() Callback (Server Runtime)
          if (error?.message?.includes('Edge Runtime')) {
            // Edge Runtime → Prisma nicht verfügbar → OK, wird im session() Callback geprüft
            console.log('JWT callback in Edge Runtime - sessionId wird im session() Callback gesetzt');
          } else {
            console.error('Error finding session for JWT:', error);
          }
        }
      }
      
      // WICHTIG: KEINE Session-Validation hier im JWT-Callback!
      // Prisma funktioniert nicht im Edge Runtime (Middleware nutzt JWT-Callback)
      // Die Validation erfolgt im session() Callback (nur Server Runtime)
      
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



