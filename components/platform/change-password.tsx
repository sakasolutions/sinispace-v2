'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { changePassword } from '@/actions/auth-actions';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export function ChangePassword() {
  // @ts-ignore
  const [state, formAction] = useActionState(changePassword, null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="mt-4 sm:mt-6 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
      <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Passwort ändern</h2>
      <p className="text-xs sm:text-sm text-zinc-400 mb-4">
        Ändere dein Passwort, um dein Konto sicher zu halten.
      </p>

      <form action={formAction} className="space-y-4">
        {/* Aktuelles Passwort */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-zinc-300 mb-2">
            Aktuelles Passwort
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              required
              className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              placeholder="Aktuelles Passwort eingeben"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Neues Passwort */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-zinc-300 mb-2">
            Neues Passwort
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              required
              minLength={8}
              className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              placeholder="Mindestens 8 Zeichen"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {showNewPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">
            Mindestens 8 Zeichen
          </p>
        </div>

        {/* Passwort bestätigen */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-zinc-300 mb-2">
            Neues Passwort bestätigen
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              minLength={8}
              className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              placeholder="Passwort wiederholen"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Fehler/Success Meldung */}
        {state?.error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            {state.message || 'Passwort erfolgreich geändert!'}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={state?.success}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-xs sm:text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 min-h-[44px]"
        >
          {state?.success ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Passwort geändert</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Passwort ändern</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
