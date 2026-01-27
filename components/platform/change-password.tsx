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
    <div className="mt-4 sm:mt-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Passwort ändern</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ändere dein Passwort, um dein Konto sicher zu halten.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aktuelles Passwort
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all min-h-[44px]"
              placeholder="Aktuelles Passwort eingeben"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neues Passwort
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all min-h-[44px]"
              placeholder="Mindestens 8 Zeichen"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showNewPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mindestens 8 Zeichen
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neues Passwort bestätigen
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all min-h-[44px]"
              placeholder="Passwort wiederholen"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {state?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {state.message || 'Passwort erfolgreich geändert!'}
          </div>
        )}

        <button
          type="submit"
          disabled={state?.success}
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-sm font-medium text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
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
