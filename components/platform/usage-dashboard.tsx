'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/** Optional: Monats-Kontingent für eine einfache Fortschrittsanzeige (nur UI). Unset = nur Hinweistext, keine Leiste. */
const MONTHLY_TOKEN_CAP =
  typeof process.env.NEXT_PUBLIC_PREMIUM_MONTHLY_TOKEN_CAP === 'string' &&
  process.env.NEXT_PUBLIC_PREMIUM_MONTHLY_TOKEN_CAP.trim() !== ''
    ? Number(process.env.NEXT_PUBLIC_PREMIUM_MONTHLY_TOKEN_CAP)
    : null;

const hasCap =
  MONTHLY_TOKEN_CAP != null && !Number.isNaN(MONTHLY_TOKEN_CAP) && MONTHLY_TOKEN_CAP > 0;

export function UsageDashboard() {
  const [monthTokens, setMonthTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/usage?period=month')
      .then((res) => res.json())
      .then((data: { monthTokens?: number; error?: string }) => {
        if (typeof data.monthTokens === 'number') {
          setMonthTokens(data.monthTokens);
        } else {
          setMonthTokens(0);
        }
        setLoading(false);
      })
      .catch(() => {
        setMonthTokens(null);
        setLoading(false);
      });
  }, []);

  const formatTokens = (n: number) =>
    new Intl.NumberFormat('de-DE').format(Math.round(n)) + ' Tokens';

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1D] p-6 sm:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/2" />
          <div className="h-12 bg-white/5 rounded w-2/3" />
          <div className="h-3 bg-white/10 rounded-full w-full max-w-xs" />
        </div>
      </div>
    );
  }

  if (monthTokens === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1D] p-6 sm:p-8">
        <p className="text-sm text-zinc-400">Nutzungsdaten konnten nicht geladen werden.</p>
      </div>
    );
  }

  const pct = hasCap ? Math.min(100, (monthTokens / MONTHLY_TOKEN_CAP!) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1D] p-6 sm:p-8 shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/25">
          <Sparkles className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Nutzung & Kontingent</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Aktueller Kalendermonat</p>
        </div>
      </div>

      <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums">
        {formatTokens(monthTokens)}
      </p>

      {hasCap ? (
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Verbrauch im Monat</span>
            <span className="tabular-nums">
              {new Intl.NumberFormat('de-DE').format(Math.round(monthTokens))} /{' '}
              {new Intl.NumberFormat('de-DE').format(MONTHLY_TOKEN_CAP!)} Tokens
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-md">
          Dein Premium-Tarif deckt deine aktuelle Nutzung vollständig ab.
        </p>
      )}
    </div>
  );
}
