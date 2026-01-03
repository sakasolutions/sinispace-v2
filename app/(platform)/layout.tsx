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
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <PlatformLayoutContent>
      {children}
    </PlatformLayoutContent>
  );
}