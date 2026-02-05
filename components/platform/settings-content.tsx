'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createCheckoutSession } from '@/actions/payment-actions';
import { signOutAction } from '@/actions/auth-actions';
import { ChangeName } from './change-name';
import { ChangePassword } from './change-password';
import { DeleteAccount } from './delete-account';
import { UsageDashboard } from './usage-dashboard';
import {
  Pencil,
  User,
  Lock,
  CreditCard,
  ShieldAlert,
  LogOut,
  ChevronRight,
} from 'lucide-react';

type UserData = {
  id: string;
  email: string | null;
  name: string | null;
  subscriptionEnd: string | null; // ISO date from server
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

  const displayName = user?.name || userEmail;

  return (
    <div className="max-w-2xl w-full pt-24 px-6 pb-40">
      {/* Alerts */}
      {params.success && (
        <div className="mb-6 rounded-2xl border border-green-200/80 bg-green-50/80 backdrop-blur-sm p-4 sm:p-5 text-green-800 shadow-sm">
          <strong>Erfolg!</strong> Dein Account wird in Kürze freigeschaltet.
        </div>
      )}
      {params.canceled && (
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/80 backdrop-blur-sm p-4 sm:p-5 text-amber-800 shadow-sm">
          Der Kaufvorgang wurde abgebrochen.
        </div>
      )}

      {/* Profile Hero */}
      <div className="w-full p-6 mb-8 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-[24px] border-4 border-white bg-gray-100 flex items-center justify-center text-3xl shrink-0 overflow-hidden shadow-inner">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-gray-900 truncate">{displayName}</p>
            <p className="text-sm text-gray-500 truncate">{userEmail}</p>
          </div>
          <Link
            href="/settings?edit=profile"
            className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/60 shrink-0 hover:bg-white/70 transition-colors"
            aria-label="Profil bearbeiten"
          >
            <Pencil className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>

      {/* Token & Stats (Pro) – Glass-Kacheln mit Gradient-Text */}
      {isPro && (
        <div className="mb-8">
          <UsageDashboard />
        </div>
      )}

      {/* Island: Account */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[24px] overflow-hidden mb-6">
        <button
          type="button"
          onClick={() => setExpandedAccount(expandedAccount === 'name' ? null : 'name')}
          className="w-full flex items-center px-4 py-4 hover:bg-white/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mr-4 shrink-0 bg-gradient-to-br from-blue-400 to-cyan-500">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-gray-800 flex-1">Nutzernamen ändern</span>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </button>
        {expandedAccount === 'name' && (
          <div className="px-4 pb-4 pt-0 border-t border-white/30">
            <ChangeName embedded />
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpandedAccount(expandedAccount === 'password' ? null : 'password')}
          className="w-full flex items-center px-4 py-4 hover:bg-white/40 transition-colors text-left border-t border-white/30"
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mr-4 shrink-0 bg-gradient-to-br from-violet-400 to-purple-500">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-gray-800 flex-1">Passwort ändern</span>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </button>
        {expandedAccount === 'password' && (
          <div className="px-4 pb-4 pt-0 border-t border-white/30">
            <ChangePassword embedded />
          </div>
        )}
      </div>

      {/* Island: Mein Tarif */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[24px] overflow-hidden mb-6">
        <div className="px-4 py-4 flex items-center">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mr-4 shrink-0 bg-gradient-to-br from-amber-400 to-orange-500">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800">Mein Tarif</p>
            <p className={`text-sm font-bold ${isPro ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent' : 'text-gray-600'}`}>
              {isPro ? 'Premium Aktiv' : 'Kostenloser Account'}
            </p>
            {isPro && user?.subscriptionEnd && (
              <p className="text-xs text-gray-500 mt-0.5">
                Läuft ab: {new Date(user.subscriptionEnd).toLocaleDateString('de-DE')}
              </p>
            )}
          </div>
          {!isPro && (
            <form action={createCheckoutSession} className="shrink-0">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/30 transition-all"
              >
                Upgraden
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Island: Rechtliches */}
      <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[24px] overflow-hidden mb-6">
        <button
          type="button"
          onClick={() => setExpandedLegal(!expandedLegal)}
          className="w-full flex items-center px-4 py-4 hover:bg-white/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mr-4 shrink-0 bg-gradient-to-br from-red-400 to-rose-500">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-gray-800 flex-1">Konto endgültig löschen</span>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </button>
        {expandedLegal && (
          <div className="px-4 pb-4 pt-0 border-t border-white/30">
            <DeleteAccount embedded />
          </div>
        )}
      </div>

      {/* Water Drop Logout */}
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full py-4 mt-8 rounded-[24px] flex items-center justify-center gap-2 bg-red-50/30 backdrop-blur-md border border-red-100/50 text-red-600 font-bold transition-colors hover:bg-red-50/50"
          style={{
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.8), 0 4px 10px rgba(220,38,38,0.05)',
          }}
        >
          <LogOut className="w-5 h-5" />
          Abmelden
        </button>
      </form>
    </div>
  );
}
