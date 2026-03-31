'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createCheckoutSession } from '@/actions/payment-actions';
import { signOutAction } from '@/actions/auth-actions';
import { ChangeName } from './change-name';
import { ChangePassword } from './change-password';
import { DeleteAccount } from './delete-account';
import { UsageDashboard } from './usage-dashboard';
import { PLATFORM_INSET_CARD_CLASS } from '@/components/platform/platform-inset-layout';
import {
  Pencil,
  User,
  Lock,
  CreditCard,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Zap,
  Lightbulb,
} from 'lucide-react';

const cardClass = PLATFORM_INSET_CARD_CLASS;

const rowInteractiveClass =
  'flex w-full items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer text-left';

const supportMailto = `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@sinispace.app'}?subject=${encodeURIComponent('Feedback SiniSpace')}&body=${encodeURIComponent('')}`;

type UserData = {
  id: string;
  email: string | null;
  name: string | null;
  subscriptionEnd: string | null;
};

type SettingsContentProps = {
  user: UserData | null;
  userEmail: string;
  isPro: boolean;
  params: { success?: string; canceled?: string };
};

export function SettingsContent({ user, userEmail, isPro, params }: SettingsContentProps) {
  const [expandedAccount, setExpandedAccount] = useState<'name' | 'password' | null>(null);
  const [expandedLegal, setExpandedLegal] = useState(false);
  const [expandedUsage, setExpandedUsage] = useState(false);

  const displayName = user?.name || userEmail;

  return (
    <div className="w-full space-y-6">
      {params.success && (
        <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 text-emerald-100 shadow-sm">
          <strong>Erfolg!</strong> Dein Account wird in Kürze freigeschaltet.
        </div>
      )}
      {params.canceled && (
        <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-amber-100 shadow-sm">
          Der Kaufvorgang wurde abgebrochen.
        </div>
      )}

      {/* Sektion 1: Account & Tarif */}
      <div className={cardClass}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border border-white/10 bg-zinc-800/80 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold text-white truncate">{displayName}</p>
              <p className="text-sm text-zinc-400 truncate">{userEmail}</p>
            </div>
            <Link
              href="/settings?edit=profile"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors border border-white/10"
              aria-label="Profil bearbeiten"
            >
              <Pencil className="w-5 h-5 text-zinc-300" />
            </Link>
          </div>
        </div>

        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-orange-600">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white">Mein Tarif</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {isPro ? (
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                    Premium Aktiv
                  </span>
                ) : (
                  <span className="text-sm text-zinc-400">Kostenloser Account</span>
                )}
              </div>
              {isPro && user?.subscriptionEnd && (
                <p className="text-xs text-zinc-500 mt-1.5">
                  Läuft ab: {new Date(user.subscriptionEnd).toLocaleDateString('de-DE')}
                </p>
              )}
            </div>
          </div>
          {!isPro && (
            <form action={createCheckoutSession} className="shrink-0 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all"
              >
                Upgraden
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Token & Stats (Pro) */}
      {isPro && (
        <div className={cardClass}>
          <button
            type="button"
            onClick={() => setExpandedUsage(!expandedUsage)}
            className={rowInteractiveClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 to-orange-500">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-white">Token-Usage & Kosten</span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-zinc-500 shrink-0 transition-transform duration-200 ${expandedUsage ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedUsage && (
            <div className="border-t border-white/5 bg-zinc-950/40 p-4">
              <UsageDashboard />
            </div>
          )}
        </div>
      )}

      {/* Account: Name & Passwort */}
      <div className={cardClass}>
        <button
          type="button"
          onClick={() => setExpandedAccount(expandedAccount === 'name' ? null : 'name')}
          className={rowInteractiveClass}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-500 to-cyan-600">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-white">Nutzernamen ändern</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
        </button>
        {expandedAccount === 'name' && (
          <div className="border-t border-white/5 bg-zinc-950/40 px-4 py-4">
            <ChangeName embedded />
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpandedAccount(expandedAccount === 'password' ? null : 'password')}
          className={rowInteractiveClass}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-zinc-600 to-zinc-700">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-white">Passwort ändern</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
        </button>
        {expandedAccount === 'password' && (
          <div className="border-t border-white/5 bg-zinc-950/40 px-4 py-4">
            <ChangePassword embedded />
          </div>
        )}
      </div>

      {/* Sektion 2: Support & Feedback */}
      <div className="w-full space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
          Support & Feedback
        </h2>
        <div className={cardClass}>
          <a
            href={supportMailto}
            className="flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)] group-hover:shadow-[0_0_28px_-2px_rgba(251,191,36,0.45)] transition-shadow">
                <Lightbulb className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-white block">💡 Feedback oder Fehler melden</span>
                <span className="text-xs text-zinc-500">Schreib uns direkt per E-Mail</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
          </a>
        </div>
      </div>

      {/* Sektion 3: Danger Zone */}
      <div className="w-full space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400/80 px-1">
          Gefahrenbereich
        </h2>
        <div className={cardClass}>
          <button
            type="button"
            onClick={() => setExpandedLegal(!expandedLegal)}
            className={`${rowInteractiveClass} text-red-400 hover:text-red-300 hover:bg-red-500/10`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-500/15 border border-red-500/25">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-medium">Konto endgültig löschen</span>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400/70 shrink-0" />
          </button>
          {expandedLegal && (
            <div className="border-t border-white/5 bg-zinc-950/40 px-4 py-4">
              <DeleteAccount embedded />
            </div>
          )}
        </div>
      </div>

      <form action={signOutAction} className="w-full">
        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 bg-zinc-800/80 border border-white/10 text-zinc-200 font-medium transition-colors hover:bg-zinc-800 hover:border-white/15"
        >
          <LogOut className="w-5 h-5 text-zinc-400" />
          Abmelden
        </button>
      </form>
    </div>
  );
}
