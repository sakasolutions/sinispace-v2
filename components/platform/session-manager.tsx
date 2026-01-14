'use client';

import { useState, useEffect } from 'react';
import { getSessions, revokeSession, revokeAllOtherSessions } from '@/actions/session-actions';

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

  async function handleRevokeAllOther() {
    if (!confirm('Möchtest du wirklich alle anderen Sessions beenden?')) {
      return;
    }

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
  }

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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900 mb-4">Aktive Sessions</h2>
        <p className="text-sm text-zinc-500">Lade Sessions...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900">Aktive Sessions</h2>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOther}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Alle anderen beenden
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">Keine aktiven Sessions gefunden.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                session.isCurrent
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-900">
                    Session
                  </span>
                  {session.isCurrent && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Aktiv
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 space-y-0.5">
                  <p>Erstellt: {formatDate(session.createdAt)}</p>
                  <p>Läuft ab in: {getTimeUntilExpiry(session.expires)}</p>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="ml-4 text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Beenden
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Sessions laufen automatisch nach 30 Tagen ab. Du kannst sie jederzeit manuell beenden.
      </p>
    </div>
  );
}
