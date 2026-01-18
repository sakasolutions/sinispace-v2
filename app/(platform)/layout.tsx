import { auth } from '@/auth';
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
    redirect('/login');
  }

  return (
    <PlatformLayoutContent>
      {children}
    </PlatformLayoutContent>
  );
}