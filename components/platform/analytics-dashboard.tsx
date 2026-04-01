'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, Sparkles, BarChart3, User } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { UserAnalytics } from './user-analytics';
import { PLATFORM_INSET_CARD_CLASS } from '@/components/platform/platform-inset-layout';

type AnalyticsData = {
  bi?: {
    config: {
      championActions7dThreshold: number;
    };
    northStar: {
      activeChampions: number;
      ahaMomentRate: number;
      avgFeatureLatencySec: number | null;
      returningUsers7d: number;
    };
    funnel: {
      steps: Array<{ id: string; label: string; users: number }>;
    };
    leaderboard: Array<{
      rank: number;
      userId: string;
      email: string | null;
      actions7d: number;
      lastLoginAt: Date | null;
    }>;
  };
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [showUserAnalytics, setShowUserAnalytics] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${timeRange}`)
      .then(res => res.json())
      .then((data: AnalyticsData) => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden der Analytics:', err);
        setLoading(false);
      });
  }, [timeRange]);

  if (loading) {
    return (
      <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
        <p className="text-zinc-400">Analytics-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  const bi = data.bi;
  if (!bi) {
    return (
      <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
        <p className="text-zinc-400">BI-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  const formatPct = (v: number) => `${Math.round(v * 10) / 10}%`;
  const formatSec = (v: number) =>
    v >= 60 ? `${Math.round((v / 60) * 10) / 10} Min` : `${Math.round(v)} s`;

  const funnelMax = Math.max(...bi.funnel.steps.map((s) => s.users), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            BI Dashboard
          </h2>
          <p className="text-sm text-zinc-400 mt-1">North Stars, Funnel & Champions – Fokus auf Verhalten statt Vanity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUserAnalytics(!showUserAnalytics)}
            className={`px-4 py-2 rounded-md border transition-all flex items-center gap-2 text-sm font-medium ${
              showUserAnalytics
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                : 'border-white/10 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
            }`}
          >
            <User className="w-4 h-4" />
            {showUserAnalytics ? 'Gesamt-Ansicht' : 'User-Ansicht'}
          </button>
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
      </div>

      {/* User Analytics View */}
      {showUserAnalytics && (
        <UserAnalytics />
      )}

      {/* Standard Analytics View */}
      {!showUserAnalytics && (
        <>
      {/* Sektion 1: North Star KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-400">Aktive Champions (7d)</p>
            <Users className="w-5 h-5 text-amber-400/80" />
          </div>
          <p className="text-3xl font-semibold text-white tabular-nums">{bi.northStar.activeChampions}</p>
          <p className="text-xs text-zinc-500 mt-2">
            &gt;{bi.config.championActions7dThreshold} Aktionen in 7 Tagen
          </p>
        </div>

        <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-400">Aha-Moment Rate</p>
            <Sparkles className="w-5 h-5 text-orange-400/80" />
          </div>
          <p className="text-3xl font-semibold text-white tabular-nums">{formatPct(bi.northStar.ahaMomentRate)}</p>
          <p className="text-xs text-zinc-500 mt-2">
            Rezept → Einkaufsliste (Proxy: Update ≤ 24h)
          </p>
        </div>

        <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-400">
              {bi.northStar.avgFeatureLatencySec ? 'Ø Feature-Latenz (7d)' : 'Wiederkehrende User (7d)'}
            </p>
            <Activity className="w-5 h-5 text-sky-400/80" />
          </div>
          <p className="text-3xl font-semibold text-white tabular-nums">
            {bi.northStar.avgFeatureLatencySec ? formatSec(bi.northStar.avgFeatureLatencySec) : bi.northStar.returningUsers7d}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            {bi.northStar.avgFeatureLatencySec
              ? 'Aus FeatureUsage.duration (falls vorhanden)'
              : 'Aktiv in den letzten 7d UND in den 7d davor'}
          </p>
        </div>
      </div>

      {/* Sektion 2: Funnel */}
      <div className={`${PLATFORM_INSET_CARD_CLASS} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Conversion Funnel</h3>
          <p className="text-xs text-zinc-500">7 Tage</p>
        </div>
        <div className="space-y-3">
          {bi.funnel.steps.map((step) => {
            const pct = Math.round((step.users / funnelMax) * 1000) / 10;
            return (
              <div key={step.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{step.label}</span>
                  <span className="text-zinc-400 tabular-nums">
                    {step.users} User <span className="text-zinc-600">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500/80 to-amber-500/80"
                    style={{ width: `${Math.max(2, (step.users / funnelMax) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {bi.funnel.steps.length === 0 && (
            <p className="text-sm text-zinc-400">Noch keine Funnel-Daten verfügbar.</p>
          )}
        </div>
      </div>

      {/* Sektion 3: Power-User Leaderboard */}
      <div className={PLATFORM_INSET_CARD_CLASS}>
        <div className="px-4 sm:px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Champions Leaderboard</h3>
          <p className="text-xs text-zinc-500 mt-1">Rang nach Aktionen (7 Tage) – inkl. E-Mail</p>
        </div>
        <div className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="py-2 pr-4 font-medium">Rang</th>
                <th className="py-2 pr-4 font-medium">E-Mail</th>
                <th className="py-2 pr-4 font-medium">Aktionen (7d)</th>
                <th className="py-2 pr-0 font-medium">Letzter Login</th>
              </tr>
            </thead>
            <tbody>
              {bi.leaderboard.map((row) => (
                <tr
                  key={row.userId}
                  className="border-t border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 pr-4 text-zinc-400 tabular-nums">{row.rank}</td>
                  <td className="py-3 pr-4 text-white">
                    {row.email ?? <span className="text-zinc-500">Unbekannt</span>}
                  </td>
                  <td className="py-3 pr-4 text-zinc-200 tabular-nums">{row.actions7d}</td>
                  <td className="py-3 pr-0 text-zinc-400 tabular-nums">
                    {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString('de-DE') : '—'}
                  </td>
                </tr>
              ))}
              {bi.leaderboard.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">
                    Noch keine Aktivität im Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
