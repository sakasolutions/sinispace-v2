'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, DollarSign, BarChart3, Users } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';

type UsageData = {
  total: {
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    requests: number;
    cost: number;
  };
  userStats: Array<{
    userId: string;
    tokens: number;
    requests: number;
    cost: number;
  }>;
  toolStats: Array<{
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

export function UsageAnalytics() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/usage?days=${timeRange}`)
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cost);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Token-Usage & Kosten-Analytics
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Globale AI-Token-Verbrauch und Kosten-Tracking</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Gesamt Tokens</p>
              <p className="text-2xl font-bold text-white">{formatNumber(data.total.tokens)}</p>
              <p className="text-xs text-zinc-500 mt-1">{data.total.requests} Requests</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Input / Output</p>
              <p className="text-lg font-bold text-white">
                <span className="text-blue-400">{formatNumber(data.total.promptTokens)}</span>
                {' / '}
                <span className="text-green-400">{formatNumber(data.total.completionTokens)}</span>
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Gesamt Kosten</p>
              <p className="text-2xl font-bold text-white">{formatCost(data.total.cost)}</p>
              <p className="text-xs text-zinc-500 mt-1">Ø {formatCost(data.costStats.average)}/Request</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Aktive User</p>
              <p className="text-2xl font-bold text-white">{data.userStats.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Mit Token-Usage</p>
            </div>
            <Users className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Usage nach Tool */}
      {data.toolStats.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Usage nach Tool
          </h3>
          <div className="space-y-3">
            {data.toolStats
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
                          className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
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

      {/* Top User */}
      {data.userStats.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Top User (Token-Verbrauch)
          </h3>
          <div className="space-y-2">
            {data.userStats
              .sort((a, b) => b.tokens - a.tokens)
              .slice(0, 10)
              .map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm font-mono w-6">{index + 1}.</span>
                    <span className="text-zinc-300 text-sm font-mono">{user.userId.substring(0, 8)}...</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatNumber(user.tokens)}</p>
                    <p className="text-xs text-zinc-400">
                      {user.requests} Requests • {formatCost(user.cost)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
