import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const snapshot = await getDashboardSnapshot(session.user.id);

  return (
    <DashboardClient
      todaysMealTitle={snapshot.todaysMealTitle}
      openCartItemsCount={snapshot.openCartItemsCount}
    />
  );
}
