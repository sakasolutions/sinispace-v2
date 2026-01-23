import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Users, TrendingUp, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  // SICHERHEIT: The Bouncer 🚪
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // Prüfe ob User eingeloggt ist
  if (!session?.user?.email) {
    redirect('/');
  }

  // Prüfe ob User Admin ist
  if (session.user.email !== adminEmail) {
    console.log(`[ADMIN] ❌ Unauthorized access attempt from: ${session.user.email}`);
    redirect('/');
  }

  // DATEN-ABFRAGE (Performance: Promise.all)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalUsers, newUsers7d, recentUsers] = await Promise.all([
    // Total Users
    prisma.user.count(),
    
    // New Users (7d)
    prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    
    // Recent Users List (letzte 20)
    prisma.user.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    }),
  ]);

  // Formatierung: Datum
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Formatierung: User-ID kürzen
  const shortenId = (id: string) => {
    return `${id.substring(0, 8)}...`;
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Mission Control 🚀
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            System Status & User Growth
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur App
        </Link>
      </div>

      {/* KPI CARDS (Grid, 3 Cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Gesamt User */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Gesamt User</p>
          <p className="text-3xl font-bold text-white">{totalUsers.toLocaleString('de-DE')}</p>
        </div>

        {/* Neu (7 Tage) */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Neu (7 Tage)</p>
          <p className="text-3xl font-bold text-green-400">+{newUsers7d}</p>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-lg font-semibold text-white">System Operational</p>
          </div>
        </div>
      </div>

      {/* USER-LISTE (Tabelle) */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Letzte Anmeldungen</h2>
          <p className="text-sm text-zinc-400 mt-1">Die letzten 20 registrierten User</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-zinc-400 border-b border-white/10">
                <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">User</th>
                <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Joined</th>
                <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || user.email || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-medium">
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.name || 'Kein Name'}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <p className="text-sm text-zinc-300">
                      {formatDate(user.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <p className="text-xs font-mono text-zinc-500">
                      {shortenId(user.id)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentUsers.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            <p>Noch keine User registriert.</p>
          </div>
        )}
      </div>
    </div>
  );
}
