'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAccount } from '@/actions/auth-actions';
import { AlertTriangle } from 'lucide-react';

export function DeleteAccount() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteClick = () => {
    setIsConfirming(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteAccount();
      
      if (result.success) {
        // User wurde gelöscht und ausgeloggt - zur Login-Seite weiterleiten
        router.push('/login');
        router.refresh(); // Seite aktualisieren um sicherzustellen, dass Session weg ist
      } else {
        setError(result.error || 'Fehler beim Löschen des Kontos');
        setIsDeleting(false);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="font-semibold text-red-900 mb-2">Konto endgültig löschen</h2>
          <p className="text-sm text-red-800 mb-4">
            Wenn du dein Konto löschst, werden <strong>alle deine Daten unwiderruflich gelöscht</strong>:
          </p>
          <ul className="text-sm text-red-800 space-y-1 mb-4 list-disc list-inside">
            <li>Alle deine Chats und Nachrichten</li>
            <li>Dein Profil und Account-Informationen</li>
            <li>Deine aktive Subscription endet <strong>sofort und für immer</strong></li>
            <li>Du kannst <strong>nicht zurückkehren</strong> - diese Aktion ist endgültig</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-300 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!isConfirming ? (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Konto löschen
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-red-100 border-2 border-red-400 p-4">
            <p className="text-sm font-semibold text-red-900 mb-2">
              ⚠️ Letzte Warnung
            </p>
            <p className="text-sm text-red-800">
              Bist du dir <strong>absolut sicher</strong>? Diese Aktion kann nicht rückgängig gemacht werden.
              Deine Subscription endet sofort und alle Daten werden gelöscht.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Lösche Konto...' : 'Ja, endgültig löschen'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
