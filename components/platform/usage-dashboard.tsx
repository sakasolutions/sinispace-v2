'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, DollarSign, AlertTriangle, BarChart3, Clock } from 'lucide-react';

type UsageData = {
  total: {
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    requests: number;
    cost: number;
  };
  today: {
    tokens: number;
    requests: number;
    cost: number;
  };
  week: {
    tokens: number;
    requests: number;
    cost: number;
  };
  byTool: Array<{
    toolId: string;
    toolName: string;
    tokens: number;
    requests: number;
    cost: number;
  }>;
  costStats: {
    total: number;
    average: number;
  };
};

export function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetch(`/api/user/usage?days=${timeRange}`)
      .then(res => res.json())
      .then((data: UsageData) => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden der Usage-Daten:', err);
        setLoading(false);
      });
  }, [timeRange]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(Math.round(num));
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(cost);
  };

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
        <p className="text-zinc-400">Usage-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  // Warnung bei hohem Verbrauch (mehr als 80% eines geschätzten Limits)
  const estimatedDailyLimit = 100000; // Geschätztes Limit (kann konfigurierbar gemacht werden)
  const usagePercentage = (data.today.tokens / estimatedDailyLimit) * 100;
  const showWarning = usagePercentage >= 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Token-Usage & Kosten
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Verbrauchte AI-Tokens und geschätzte Kosten</p>
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

      {/* Warnung bei hohem Verbrauch */}
      {showWarning && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Hoher Token-Verbrauch</p>
              <p className="text-xs text-zinc-300 mt-1">
                Du hast heute bereits {formatNumber(data.today.tokens)} Tokens verbraucht ({usagePercentage.toFixed(1)}% des geschätzten Limits).
                {usagePercentage >= 100 && ' Das Tageslimit ist erreicht.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Heute</p>
              <p className="text-2xl font-bold text-white">{formatNumber(data.today.tokens)}</p>
              <p className="text-xs text-zinc-500 mt-1">{data.today.requests} Requests</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Diese Woche</p>
              <p className="text-2xl font-bold text-white">{formatNumber(data.week.tokens)}</p>
              <p className="text-xs text-zinc-500 mt-1">{data.week.requests} Requests</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Gesamt ({timeRange}d)</p>
              <p className="text-2xl font-bold text-white">{formatNumber(data.total.tokens)}</p>
              <p className="text-xs text-zinc-500 mt-1">{data.total.requests} Requests</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Geschätzte Kosten</p>
              <p className="text-2xl font-bold text-white">{formatCost(data.total.cost)}</p>
              <p className="text-xs text-zinc-500 mt-1">Ø {formatCost(data.costStats.average)}/Request</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Token-Aufschlüsselung */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Token-Aufschlüsselung ({timeRange} Tage)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400 mb-1">Input-Tokens</p>
            <p className="text-xl font-bold text-white">{formatNumber(data.total.promptTokens)}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {data.total.tokens > 0 
                ? `${((data.total.promptTokens / data.total.tokens) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-green-400 mb-1">Output-Tokens</p>
            <p className="text-xl font-bold text-white">{formatNumber(data.total.completionTokens)}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {data.total.tokens > 0 
                ? `${((data.total.completionTokens / data.total.tokens) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-400 mb-1">Gesamt</p>
            <p className="text-xl font-bold text-white">{formatNumber(data.total.tokens)}</p>
            <p className="text-xs text-zinc-400 mt-1">100%</p>
          </div>
        </div>
      </div>

      {/* Usage nach Tool */}
      {data.byTool.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Usage nach Tool
          </h3>
          <div className="space-y-3">
            {data.byTool
              .sort((a, b) => b.tokens - a.tokens)
              .map((tool) => {
                const percentage = data.total.tokens > 0 
                  ? (tool.tokens / data.total.tokens) * 100 
                  : 0;
                return (
                  <div key={tool.toolId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{tool.toolName}</p>
                        <p className="text-xs text-zinc-400">{tool.toolId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatNumber(tool.tokens)}</p>
                        <p className="text-xs text-zinc-400">
                          {tool.requests} Requests • {formatCost(tool.cost)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-700/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-16 text-right">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {data.total.tokens === 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 text-center">
          <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-400">Noch keine Token-Usage in diesem Zeitraum.</p>
        </div>
      )}
    </div>
  );
}
