'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { changeName } from '@/actions/auth-actions';
import { User, Eye, EyeOff } from 'lucide-react';

export function ChangeName() {
  const router = useRouter();
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');

  // @ts-ignore
  const [state, formAction] = useActionState(changeName, null);

  // Nach erfolgreichem Ändern: Seite neu laden
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.refresh();
        setShowInput(false);
        setNewName('');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
      <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Nutzernamen ändern</h2>
      <p className="text-xs sm:text-sm text-zinc-400 mb-4">
        Ändere deinen Anzeigenamen. Dieser wird in deinem Profil und in Chats angezeigt.
      </p>

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
        >
          Nutzernamen ändern
        </button>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-zinc-300 mb-2">
              Neuer Nutzernamen
            </label>
            <input
              type="text"
              name="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. Max Mustermann"
              maxLength={50}
              required
              className="w-full rounded-md border border-white/10 bg-zinc-800/50 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">
              {newName.length}/50 Zeichen
            </p>
          </div>

          {state?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
              {state.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setNewName('');
              }}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs sm:text-sm font-medium transition-all"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
