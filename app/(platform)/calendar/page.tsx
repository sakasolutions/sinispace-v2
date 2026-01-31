import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CalendarClient } from './calendar-client';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return <CalendarClient />;
}
