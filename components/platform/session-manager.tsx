'use client';

import { useState, useEffect } from 'react';
import { getSessions, revokeSession, revokeAllOtherSessions } from '@/actions/session-actions';

// Custom Confirm Modal
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}

type Session = {
  id: string;
  expires: Date;
  createdAt: Date;
  isCurrent: boolean;
};

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'all' | null }>({
    isOpen: false,
    type: null,
  });

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      console.log('[SessionManager] Lade Sessions...');
      const data = await getSessions();
      console.log('[SessionManager] Sessions erhalten:', data.length, data);
      setSessions(data);
    } catch (error) {
      console.error('[SessionManager] Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const result = await revokeSession(sessionId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Session wurde beendet' });
        await loadSessions();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fehler beim Beenden der Session' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Beenden der Session' });
    }
  }

  const handleRevokeAllOther = () => {
    setConfirmModal({
      isOpen: true,
      type: 'all',
    });
  };

  const confirmRevokeAll = async () => {
    try {
      const result = await revokeAllOtherSessions();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Alle anderen Sessions wurden beendet' });
        await loadSessions();
      } else {
        setMessage({ type: 'error', text: result.error || 'Fehler beim Beenden der Sessions' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Beenden der Sessions' });
    }
    setConfirmModal({ isOpen: false, type: null });
  };

  function formatDate(date: Date) {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getTimeUntilExpiry(expires: Date) {
    const now = new Date();
    const expiry = new Date(expires);
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} Tag${days > 1 ? 'e' : ''}`;
    } else if (hours > 0) {
      return `${hours} Stunde${hours > 1 ? 'n' : ''}`;
    } else {
      return 'Weniger als 1 Stunde';
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Aktive Sessions</h2>
        <p className="text-xs sm:text-sm text-zinc-400">Lade Sessions...</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null })}
        onConfirm={confirmRevokeAll}
        title="Sessions beenden"
        message="Möchtest du wirklich alle anderen Sessions beenden?"
      />
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold text-white">Aktive Sessions</h2>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOther}
            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors self-start sm:self-auto"
          >
            Alle anderen beenden
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-3 sm:mb-4 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm backdrop-blur-xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-xs sm:text-sm text-zinc-400">Keine aktiven Sessions gefunden.</p>
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2.5 sm:p-3 rounded-lg border backdrop-blur-sm ${
                session.isCurrent
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-zinc-800/30 border-white/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    Session
                  </span>
                  {session.isCurrent && (
                    <span className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">
                      Aktiv
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-400 space-y-0.5">
                  <p className="truncate">Erstellt: {formatDate(session.createdAt)}</p>
                  <p>Läuft ab in: {getTimeUntilExpiry(session.expires)}</p>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="self-start sm:self-auto text-xs text-red-400 hover:text-red-300 font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded border border-red-500/30 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  Beenden
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-zinc-500">
        Sessions laufen automatisch nach 30 Tagen ab. Du kannst sie jederzeit manuell beenden.
      </p>
    </div>
    </>
  );
}
