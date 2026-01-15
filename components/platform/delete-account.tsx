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
    <div className="mt-6 rounded-xl border border-red-500/30 bg-gradient-to-b from-red-900/20 to-red-950/20 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(239,68,68,0.2)]">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="font-semibold text-red-300 mb-2">Konto endgültig löschen</h2>
          <p className="text-sm text-red-200/80 mb-4">
            Wenn du dein Konto löschst, werden <strong className="text-red-200">alle deine Daten unwiderruflich gelöscht</strong>:
          </p>
          <ul className="text-sm text-red-200/80 space-y-1 mb-4 list-disc list-inside">
            <li>Alle deine Chats und Nachrichten</li>
            <li>Dein Profil und Account-Informationen</li>
            <li>Deine aktive Subscription endet <strong className="text-red-200">sofort und für immer</strong></li>
            <li>Du kannst <strong className="text-red-200">nicht zurückkehren</strong> - diese Aktion ist endgültig</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/30 backdrop-blur-sm p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isConfirming ? (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/30"
        >
          Konto löschen
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-red-500/20 border-2 border-red-500/50 backdrop-blur-sm p-4">
            <p className="text-sm font-semibold text-red-200 mb-2">
              ⚠️ Letzte Warnung
            </p>
            <p className="text-sm text-red-200/90">
              Bist du dir <strong className="text-red-200">absolut sicher</strong>? Diese Aktion kann nicht rückgängig gemacht werden.
              Deine Subscription endet sofort und alle Daten werden gelöscht.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/30"
            >
              {isDeleting ? 'Lösche Konto...' : 'Ja, endgültig löschen'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 rounded-lg border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
