import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot';
import { getCalendarEvents } from '@/actions/calendar-actions';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [snapshot, initialCalendarEvents] = await Promise.all([
    getDashboardSnapshot(session.user.id),
    getCalendarEvents(),
  ]);

  return (
    <DashboardClient
      todaysMealTitle={snapshot.todaysMealTitle}
      openCartItemsCount={snapshot.openCartItemsCount}
      initialCalendarEvents={initialCalendarEvents}
    />
  );
}
