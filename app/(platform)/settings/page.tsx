import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SettingsContent } from '@/components/platform/settings-content';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionEnd: true,
    },
  });

  const userEmail = session?.user?.email || user?.email || '';
  const userId = session?.user?.id || user?.id || '';
  const isPro = !!(user?.subscriptionEnd && user.subscriptionEnd > new Date());

  const userForClient: { id: string; email: string | null; name: string | null; subscriptionEnd: string | null } | null = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionEnd: user.subscriptionEnd?.toISOString() ?? null,
      }
    : null;

  return (
    <SettingsContent
      user={userForClient}
      userEmail={userEmail}
      isPro={isPro}
      params={{
        success: typeof params.success === 'string' ? params.success : undefined,
        canceled: typeof params.canceled === 'string' ? params.canceled : undefined,
      }}
    />
  );
}
