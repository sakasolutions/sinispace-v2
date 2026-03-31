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
          // User suchen - mit select um isAdmin-Fehler zu vermeiden
          let user;
          try {
            user = await prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                password: true,
                name: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                subscriptionEnd: true,
                stripeCustomerId: true,
                isAdmin: true,
              },
            });
          } catch (prismaError: any) {
            // Wenn isAdmin-Spalte nicht existiert, verwende Raw SQL als Fallback
            if (prismaError.code === 'P2022' || prismaError.message?.includes('isAdmin')) {
              const result = await prisma.$queryRawUnsafe<Array<{
                id: string;
                email: string | null;
                password: string | null;
                name: string | null;
                image: string | null;
                emailVerified: Date | null;
                createdAt: Date;
                updatedAt: Date;
                subscriptionEnd: Date | null;
                stripeCustomerId: string | null;
                isAdmin: boolean;
              }>>(
                `SELECT id, email, password, name, image, "emailVerified", "createdAt", "updatedAt", "subscriptionEnd", "stripeCustomerId", "isAdmin" FROM "User" WHERE email = $1 LIMIT 1`,
                email
              );
              user = result[0] || null;
            } else {
              throw prismaError;
            }
          }

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

          // Last Login aktualisieren
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            }).catch(() => {
              // Ignoriere Fehler wenn Spalte noch nicht existiert
            });
          } catch {
            // Silent fail - sollte nicht die App crashen
          }

          return {
            ...user,
            isAdmin: user.isAdmin ?? false,
          };
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

      if (!token.sub) {
        return {
          ...session,
          user: null,
        } as any;
      }

      if (token.sub && session.user) {
        const u = session.user as {
          id: string;
          name?: string | null;
          email?: string | null;
          image?: string | null;
          isAdmin?: boolean;
        };
        u.id = token.sub;
        if (token.email !== undefined) {
          u.email = token.email;
        }
        if (token.isAdmin !== undefined) {
          u.isAdmin = Boolean(token.isAdmin);
        }
      }

      return session;
    },
    async jwt({ token, user }) {
      // JWT-Callback läuft auch im Edge Runtime (Middleware) → keine Prisma-Aufrufe
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.isAdmin = user.isAdmin ?? false;
        delete token.invalidated;
      }

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



