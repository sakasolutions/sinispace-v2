'use client';

import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, TrendingUp, MessageSquare, BarChart3, AlertCircle } from 'lucide-react';

type Feedback = {
  id: string;
  toolId: string;
  toolName: string;
  resultId: string | null;
  type: 'positive' | 'negative';
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type FeedbackStats = {
  total: number;
  positive: number;
  negative: number;
  satisfactionRate: number;
};

type ToolStat = {
  toolId: string;
  toolName: string;
  total: number;
  positive: number;
  negative: number;
  satisfactionRate: string;
};

type FeedbackData = {
  feedbacks: Feedback[];
  stats: FeedbackStats;
  toolStats: ToolStat[];
};

export function FeedbackDashboard() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/feedback?days=${timeRange}`)
      .then(res => res.json())
      .then((data: FeedbackData) => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden der Feedback-Daten:', err);
        setLoading(false);
      });
  }, [timeRange]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <p className="text-zinc-400">Feedback-Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Feedback-Analytics
          </h2>
          <p className="text-sm text-zinc-400 mt-1">User-Feedback für alle Tools - Gold wert für Optimierung!</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Gesamt Feedback</p>
              <p className="text-2xl font-bold text-white">{data.stats.total}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Zufriedenheit</p>
              <p className="text-2xl font-bold text-white">{data.stats.satisfactionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Positiv / Negativ</p>
              <p className="text-lg font-bold text-white">
                <span className="text-green-400">{data.stats.positive}</span>
                {' / '}
                <span className="text-red-400">{data.stats.negative}</span>
              </p>
            </div>
            <div className="flex gap-1">
              <ThumbsUp className="w-6 h-6 text-green-400 opacity-50" />
              <ThumbsDown className="w-6 h-6 text-red-400 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Tool-Statistiken */}
      {data.toolStats.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Feedback nach Tool
          </h3>
          <div className="space-y-3">
            {data.toolStats
              .sort((a, b) => b.total - a.total)
              .map((tool) => (
                <div key={tool.toolId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{tool.toolName}</p>
                      <p className="text-xs text-zinc-400">{tool.toolId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {tool.satisfactionRate}% Zufriedenheit
                      </p>
                      <p className="text-xs text-zinc-400">
                        {tool.positive} 👍 / {tool.negative} 👎
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                        style={{ width: `${tool.satisfactionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 w-12 text-right">{tool.total}x</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detailliertes Feedback */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Detailliertes Feedback ({data.feedbacks.length})
        </h3>
        {data.feedbacks.length === 0 ? (
          <p className="text-zinc-400 text-sm">Noch kein Feedback in diesem Zeitraum.</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {data.feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className={`p-4 rounded-lg border ${
                  feedback.type === 'positive'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {feedback.type === 'positive' ? (
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {feedback.toolName}
                      </span>
                      <span className="text-xs text-zinc-500">({feedback.toolId})</span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p>
                        User: <span className="text-zinc-300">{feedback.user.name || feedback.user.email || 'Unbekannt'}</span>
                      </p>
                      <p>{formatDate(feedback.createdAt)}</p>
                      {feedback.resultId && (
                        <p className="text-zinc-500">Result ID: {feedback.resultId}</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    feedback.type === 'positive'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {feedback.type === 'positive' ? '👍 Positiv' : '👎 Negativ'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      {data.stats.total > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Automatische Insights
          </h3>
          <div className="space-y-3">
            {data.stats.satisfactionRate >= 80 ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-400">Hohe Zufriedenheit</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Die User sind mit {data.stats.satisfactionRate}% sehr zufrieden. Die Tools funktionieren gut!
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Verbesserungspotenzial</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Die Zufriedenheit liegt bei {data.stats.satisfactionRate}%. Prüfe die negativen Feedbacks für konkrete Verbesserungen.
                  </p>
                </div>
              </div>
            )}

            {data.toolStats.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <BarChart3 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Top Tool</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    <strong>{data.toolStats[0].toolName}</strong> hat das meiste Feedback ({data.toolStats[0].total}x).
                    {data.toolStats[0].satisfactionRate >= 80 
                      ? ' Nutzer sind sehr zufrieden!' 
                      : ' Hier gibt es Verbesserungspotenzial.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
