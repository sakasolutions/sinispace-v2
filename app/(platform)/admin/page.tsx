import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Users, TrendingUp, Crown, MessageSquare, FileText, Activity, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { AdminTabs } from '@/components/platform/admin-tabs';

export default async function AdminPage() {
  // SICHERHEIT: The Bouncer 🚪
  const session = await auth();

  // Prüfe ob User eingeloggt ist
  if (!session?.user?.id) {
    redirect('/');
  }

  // Prüfe Admin-Flag in DB (sicherer als E-Mail-Check)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    console.log(`[ADMIN] ❌ Unauthorized access attempt from: ${session.user.email} (ID: ${session.user.id})`);
    redirect('/');
  }

  // DATEN-ABFRAGE (Performance: Promise.all)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const now = new Date();

  const [
    totalUsers,
    newUsers7d,
    premiumUsers,
    totalChats,
    totalMessages,
    activeSessions,
    recentUsers,
    recentChats,
    recentDocuments,
    usersWithChats,
    totalDocuments,
    totalDocumentsSize,
  ] = await Promise.all([
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
    
    // Premium Users
    prisma.user.count({
      where: {
        subscriptionEnd: {
          gt: now,
        },
      },
    }),
    
    // Total Chats
    prisma.chat.count(),
    
    // Total Messages
    prisma.message.count(),
    
    // Active Sessions
    prisma.session.count({
      where: {
        expires: {
          gt: now,
        },
      },
    }),
    
    // Recent Users List (letzte 20) - mit Premium Status
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
        subscriptionEnd: true,
      },
    }),
    
    // Recent Chats (letzte 20) - mit User und Counts
    prisma.chat.findMany({
      take: 20,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
            documents: true,
          },
        },
      },
    }),
    
    // Recent Documents (letzte 50)
    prisma.document.findMany({
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chat: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    
    // Users with Chats
    prisma.user.count({
      where: {
        chats: {
          some: {},
        },
      },
    }),
    
    // Total Documents
    prisma.document.count(),
    
    // Total Documents Size (Sum)
    prisma.document.aggregate({
      _sum: {
        fileSize: true,
      },
    }),
  ]);

  // Berechne Durchschnitte
  const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;
  const avgChatsPerUser = totalUsers > 0 ? totalChats / totalUsers : 0;

  // Stats für Stats-View
  const stats = {
    totalUsers,
    newUsers7d,
    premiumUsers,
    totalChats,
    totalMessages,
    activeSessions,
    avgMessagesPerChat,
    avgChatsPerUser,
    totalDocuments,
    totalDocumentsSize: totalDocumentsSize._sum.fileSize || 0,
    usersWithChats,
    usersWithPremium: premiumUsers,
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

      {/* KPI CARDS (Grid, 2 Rows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
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

        {/* Premium Users */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Premium User</p>
          <p className="text-3xl font-bold text-yellow-400">{premiumUsers}</p>
        </div>

        {/* Total Chats */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Total Chats</p>
          <p className="text-3xl font-bold text-white">{totalChats.toLocaleString('de-DE')}</p>
        </div>

        {/* Total Messages */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Total Messages</p>
          <p className="text-3xl font-bold text-white">{totalMessages.toLocaleString('de-DE')}</p>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Active Sessions</p>
          <p className="text-3xl font-bold text-white">{activeSessions}</p>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-lg font-semibold text-white">System Operational</p>
          </div>
        </div>
      </div>

      {/* TABS MIT DATEN */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Datenbank-Übersicht</h2>
          <p className="text-sm text-zinc-400 mt-1">Vollständige Einsicht in alle gespeicherten Daten</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <AdminTabs 
            users={recentUsers} 
            chats={recentChats}
            documents={recentDocuments}
            stats={stats}
          />
        </div>
      </div>
    </div>
  );
}
