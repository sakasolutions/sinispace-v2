'use client';

import { useEffect, useState } from 'react';
import { User, Activity, MessageSquare, FileText, TrendingUp, Clock, Crown, Zap } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';

type UserStat = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: Date;
    lastLoginAt: Date | null;
    isPremium: boolean;
  };
  stats: {
    totalActivities: number;
    totalFeatures: number;
    totalChats: number;
    totalDocuments: number;
    successRate: number;
    topFeatures: Array<{ feature: string; count: number }>;
    lastActivity: Date | null;
  };
};

export function UserAnalytics() {
  const [data, setData] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/user-analytics?days=${timeRange}`)
      .then(res => res.json())
      .then((data: UserStat[]) => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden der User-Analytics:', err);
        setLoading(false);
      });
  }, [timeRange]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nie';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return 'Nie aktiv';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    if (hours > 0) return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    return 'gerade eben';
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700/50 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            User-Analytics
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Detaillierte Statistiken pro User</p>
        </div>
        <CustomSelect
          value={String(timeRange)}
          onChange={(value) => setTimeRange(Number(value))}
          options={[
            { value: '7', label: 'Letzte 7 Tage' },
            { value: '30', label: 'Letzte 30 Tage' },
            { value: '90', label: 'Letzte 90 Tage' },
          ]}
        />
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 text-center">
            <p className="text-zinc-400">Noch keine User-Aktivitäten in diesem Zeitraum.</p>
          </div>
        ) : (
          data.map(({ user, stats }) => (
            <div
              key={user.id}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.email || 'User'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {user.name || 'Kein Name'}
                      </h3>
                      {user.isPremium && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{user.email}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Registriert: {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400 mb-1">Letzte Aktivität</p>
                  <p className="text-sm text-zinc-300 font-medium">
                    {formatRelativeTime(stats.lastActivity)}
                  </p>
                  {user.lastLoginAt && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Login: {formatRelativeTime(user.lastLoginAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-zinc-400">Aktivitäten</p>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalActivities}</p>
                </div>

                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <p className="text-xs text-zinc-400">Features</p>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalFeatures}</p>
                </div>

                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-zinc-400">Chats</p>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalChats}</p>
                </div>

                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-zinc-400">Dokumente</p>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalDocuments}</p>
                </div>
              </div>

              {/* Top Features & Success Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.topFeatures.length > 0 && (
                  <div className="rounded-lg bg-white/5 p-3">
                    <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Top Features
                    </p>
                    <div className="space-y-1">
                      {stats.topFeatures.map(({ feature, count }) => (
                        <div key={feature} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300 truncate">{feature}</span>
                          <span className="text-zinc-500 font-mono">{count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-zinc-400 mb-2">Erfolgsrate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stats.successRate >= 80
                            ? 'bg-green-500'
                            : stats.successRate >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(stats.successRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {stats.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
