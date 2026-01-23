'use client';

import { BarChart3, TrendingUp, Users, MessageSquare, FileText, Crown, Activity } from 'lucide-react';

type Stats = {
  totalUsers: number;
  newUsers7d: number;
  premiumUsers: number;
  totalChats: number;
  totalMessages: number;
  activeSessions: number;
  avgMessagesPerChat: number;
  avgChatsPerUser: number;
  totalDocuments: number;
  totalDocumentsSize: number;
  usersWithChats: number;
  usersWithPremium: number;
};

type AdminStatsViewProps = {
  stats: Stats;
};

export function AdminStatsView({ stats }: AdminStatsViewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* User Stats */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">User Statistiken</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gesamt User</span>
            <span className="text-lg font-bold text-white">{stats.totalUsers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Neu (7 Tage)</span>
            <span className="text-lg font-bold text-green-400">+{stats.newUsers7d}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Premium User</span>
            <span className="text-lg font-bold text-yellow-400">{stats.premiumUsers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">User mit Chats</span>
            <span className="text-lg font-bold text-white">{stats.usersWithChats}</span>
          </div>
        </div>
      </div>

      {/* Chat Stats */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Chat Statistiken</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gesamt Chats</span>
            <span className="text-lg font-bold text-white">{stats.totalChats}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gesamt Messages</span>
            <span className="text-lg font-bold text-white">{stats.totalMessages}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Ø Messages/Chat</span>
            <span className="text-lg font-bold text-white">{stats.avgMessagesPerChat.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Ø Chats/User</span>
            <span className="text-lg font-bold text-white">{stats.avgChatsPerUser.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Document Stats */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Dokument Statistiken</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gesamt Dokumente</span>
            <span className="text-lg font-bold text-white">{stats.totalDocuments}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Gesamt Größe</span>
            <span className="text-lg font-bold text-white">{formatFileSize(stats.totalDocumentsSize)}</span>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">System</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Active Sessions</span>
            <span className="text-lg font-bold text-white">{stats.activeSessions}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
