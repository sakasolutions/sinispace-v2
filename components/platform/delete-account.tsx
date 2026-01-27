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
    <div className="mt-4 sm:mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Konto endgültig löschen</h2>
          <p className="text-sm text-gray-600 mb-3">
            Wenn du dein Konto löschst, werden <strong className="text-red-600">alle deine Daten unwiderruflich gelöscht</strong>:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
            <li>Alle deine Chats und Nachrichten</li>
            <li>Dein Profil und Account-Informationen</li>
            <li>Deine aktive Subscription endet <strong className="text-red-600">sofort und für immer</strong></li>
            <li>Du kannst <strong className="text-red-600">nicht zurückkehren</strong> – diese Aktion ist endgültig</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!isConfirming ? (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="w-full sm:w-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Konto löschen
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700 mb-2">
              ⚠️ Letzte Warnung
            </p>
            <p className="text-sm text-gray-600">
              Bist du dir <strong className="text-red-600">absolut sicher</strong>? Diese Aktion kann nicht rückgängig gemacht werden.
              Deine Subscription endet sofort und alle Daten werden gelöscht.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-red-300 bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isDeleting ? 'Lösche Konto...' : 'Ja, endgültig löschen'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 rounded-xl border border-red-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
