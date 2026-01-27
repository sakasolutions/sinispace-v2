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
    <div className="mt-4 sm:mt-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Nutzernamen ändern</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ändere deinen Anzeigenamen. Dieser wird in deinem Profil und in Chats angezeigt.
      </p>

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white hover:shadow-lg transition-all shadow-sm"
        >
          Nutzernamen ändern
        </button>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              {newName.length}/50 Zeichen
            </p>
          </div>

          {state?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {state.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white hover:shadow-lg transition-all shadow-sm"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false);
                setNewName('');
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
