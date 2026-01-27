'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, DollarSign, AlertTriangle, BarChart3, Clock } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';

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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-gray-500">Usage-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  // Warnung bei hohem Verbrauch (mehr als 80% eines geschätzten Limits)
  const estimatedDailyLimit = 100000; // Geschätztes Limit (kann konfigurierbar gemacht werden)
  const usagePercentage = (data.today.tokens / estimatedDailyLimit) * 100;
  const showWarning = usagePercentage >= 80;

  return (
    <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Token-Usage & Kosten
          </h2>
          <p className="text-sm text-gray-500 mt-1">Verbrauchte AI-Tokens und geschätzte Kosten</p>
        </div>
        <div className="w-full sm:w-48">
          <CustomSelect
            theme="light"
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

      {showWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Hoher Token-Verbrauch</p>
              <p className="text-xs text-gray-600 mt-1">
                Du hast heute bereits {formatNumber(data.today.tokens)} Tokens verbraucht ({usagePercentage.toFixed(1)}% des geschätzten Limits).
                {usagePercentage >= 100 && ' Das Tageslimit ist erreicht.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Heute</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.today.tokens)}</p>
              <p className="text-xs text-gray-500 mt-1">{data.today.requests} Requests</p>
            </div>
            <Clock className="w-8 h-8 text-orange-400 opacity-60" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Diese Woche</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.week.tokens)}</p>
              <p className="text-xs text-gray-500 mt-1">{data.week.requests} Requests</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500 opacity-60" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Gesamt ({timeRange}d)</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.total.tokens)}</p>
              <p className="text-xs text-gray-500 mt-1">{data.total.requests} Requests</p>
            </div>
            <BarChart3 className="w-8 h-8 text-indigo-500 opacity-60" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Geschätzte Kosten</p>
              <p className="text-2xl font-bold text-gray-900">{formatCost(data.total.cost)}</p>
              <p className="text-xs text-gray-500 mt-1">Ø {formatCost(data.costStats.average)}/Request</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          Token-Aufschlüsselung ({timeRange} Tage)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-xs text-orange-700 mb-1">Input-Tokens</p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(data.total.promptTokens)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.total.tokens > 0 
                ? `${((data.total.promptTokens / data.total.tokens) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-green-700 mb-1">Output-Tokens</p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(data.total.completionTokens)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.total.tokens > 0 
                ? `${((data.total.completionTokens / data.total.tokens) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-pink-50 border border-pink-200">
            <p className="text-xs text-pink-700 mb-1">Gesamt</p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(data.total.tokens)}</p>
            <p className="text-xs text-gray-500 mt-1">100%</p>
          </div>
        </div>
      </div>

      {data.byTool.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
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
                        <p className="text-sm font-medium text-gray-900">{tool.toolName}</p>
                        <p className="text-xs text-gray-500">{tool.toolId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(tool.tokens)}</p>
                        <p className="text-xs text-gray-500">
                          {tool.requests} Requests • {formatCost(tool.cost)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {data.total.tokens === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Noch keine Token-Usage in diesem Zeitraum.</p>
        </div>
      )}
    </div>
  );
}
