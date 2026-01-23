'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Activity, Zap, BarChart3, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type AnalyticsData = {
  activities: Array<{
    action: string;
    page: string | null;
    feature: string | null;
    createdAt: Date;
  }>;
  features: Array<{
    feature: string;
    category: string | null;
    success: boolean;
    createdAt: Date;
  }>;
  totalUsers: number;
  activeUsers: number;
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

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
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
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
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <p className="text-zinc-400">Analytics-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  // Berechne Statistiken
  const pageViews = data.activities.filter(a => a.action === 'page_view').length;
  const featureUses = data.features.length;
  const successfulFeatures = data.features.filter(f => f.success).length;
  const successRate = featureUses > 0 ? ((successfulFeatures / featureUses) * 100).toFixed(1) : '0';

  // Top Features
  const featureCounts: Record<string, number> = {};
  data.features.forEach(f => {
    featureCounts[f.feature] = (featureCounts[f.feature] || 0) + 1;
  });
  const topFeatures = Object.entries(featureCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Top Pages
  const pageCounts: Record<string, number> = {};
  data.activities
    .filter(a => a.page)
    .forEach(a => {
      pageCounts[a.page!] = (pageCounts[a.page!] || 0) + 1;
    });
  const topPages = Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Analytics & Insights
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Automatische Datenauswertung für App-Optimierung</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value={7}>Letzte 7 Tage</option>
          <option value={30}>Letzte 30 Tage</option>
          <option value={90}>Letzte 90 Tage</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Aktive User</p>
              <p className="text-2xl font-bold text-white">{data.activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Seitenaufrufe</p>
              <p className="text-2xl font-bold text-white">{pageViews}</p>
            </div>
            <Activity className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Feature-Nutzung</p>
              <p className="text-2xl font-bold text-white">{featureUses}</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Erfolgsrate</p>
              <p className="text-2xl font-bold text-white">{successRate}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Top Features & Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Features */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Beliebte Features
          </h3>
          {topFeatures.length > 0 ? (
            <div className="space-y-3">
              {topFeatures.map(([feature, count], index) => (
                <div key={feature} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm font-mono w-6">{index + 1}.</span>
                    <span className="text-white text-sm">{feature}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">{count}x</span>
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Noch keine Feature-Nutzung getrackt.</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Beliebte Seiten
          </h3>
          {topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.map(([page, count], index) => (
                <div key={page} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm font-mono w-6">{index + 1}.</span>
                    <span className="text-white text-sm truncate">{page}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">{count}x</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Noch keine Seitenaufrufe getrackt.</p>
          )}
        </div>
      </div>

      {/* Automatische Insights */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Automatische Insights
        </h3>
        <div className="space-y-3">
          {topFeatures.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <ArrowUpRight className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">Top Feature</p>
                <p className="text-xs text-zinc-400 mt-1">
                  <strong>{topFeatures[0][0]}</strong> wird am häufigsten genutzt ({topFeatures[0][1]}x). 
                  Erwäge, dieses Feature zu bewerben oder zu erweitern.
                </p>
              </div>
            </div>
          )}
          
          {successRate && Number(successRate) < 80 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ArrowDownRight className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Niedrige Erfolgsrate</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Die Erfolgsrate liegt bei {successRate}%. Prüfe, ob Features zu komplex sind oder Fehler auftreten.
                </p>
              </div>
            </div>
          )}

          {data.activeUsers > 0 && data.totalUsers > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-400">User-Engagement</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {((data.activeUsers / data.totalUsers) * 100).toFixed(1)}% der User waren in den letzten 7 Tagen aktiv.
                  {data.activeUsers / data.totalUsers < 0.3 && ' Erwäge, Retention-Strategien zu implementieren.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
