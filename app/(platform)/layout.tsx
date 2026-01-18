import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { PlatformLayoutContent } from '@/components/platform/platform-layout-content';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Security Check: Ist der User eingeloggt?
  // WICHTIG: Prüfe explizit ob user.id existiert (nicht nur ob session.user existiert)
  // Wenn Session revoked wurde, existiert session.user, aber session.user.id ist undefined
  if (!session?.user?.id) {
    // WICHTIG: Wenn session.user null ist (ungültige Session), rufe signOut auf
    // Das löscht das ungültige JWT-Cookie, damit User sich neu einloggen kann
    if (!session?.user) {
      // Session wurde revoked (session.user ist null) → automatisch ausloggen
      // Dies löscht das ungültige JWT-Cookie und verhindert Redirect-Loops
      await signOut({ redirect: false });
    }
    redirect('/login');
  }

  return (
    <PlatformLayoutContent>
      {children}
    </PlatformLayoutContent>
  );
}