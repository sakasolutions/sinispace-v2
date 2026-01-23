'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { Pencil, Trash2, Crown, Key, X, Save, XCircle } from 'lucide-react';
import { updateUser, deleteUser, resetUserPassword, setUserPremium, removeUserPremium } from '@/actions/admin-actions';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
  subscriptionEnd: Date | null;
};

type AdminUserTableProps = {
  users: User[];
};

export function AdminUserTable({ users: initialUsers }: AdminUserTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState<string | null>(null);
  const [showRemovePremiumModal, setShowRemovePremiumModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // @ts-ignore
  const [updateState, updateAction] = useActionState(updateUser, null);
  // @ts-ignore
  const [deleteState, deleteAction] = useActionState(deleteUser, null);
  // @ts-ignore
  const [passwordState, passwordAction] = useActionState(resetUserPassword, null);
  // @ts-ignore
  const [premiumState, premiumAction] = useActionState(setUserPremium, null);
  // @ts-ignore
  const [removePremiumState, removePremiumAction] = useActionState(removeUserPremium, null);

  // Automatisches Refresh nach erfolgreichen Änderungen
  useEffect(() => {
    if (updateState?.success || deleteState?.success || passwordState?.success || premiumState?.success || removePremiumState?.success) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 1500); // 1.5 Sekunden Verzögerung, damit User Success-Meldung sieht
      return () => clearTimeout(timer);
    }
  }, [updateState?.success, deleteState?.success, passwordState?.success, premiumState?.success, removePremiumState?.success, router]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const shortenId = (id: string) => {
    return `${id.substring(0, 8)}...`;
  };

  const isPremium = (subscriptionEnd: Date | null) => {
    return subscriptionEnd && new Date(subscriptionEnd) > new Date();
  };

  const editingUser = editingUserId ? users.find(u => u.id === editingUserId) : null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-zinc-400 border-b border-white/10">
              <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">User</th>
              <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Joined</th>
              <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">ID</th>
              <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="px-4 sm:px-6 py-4">
                  {editingUserId === user.id ? (
                    <form action={updateAction} className="space-y-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="text"
                        name="name"
                        defaultValue={user.name || ''}
                        placeholder="Name"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <input
                        type="email"
                        name="email"
                        defaultValue={user.email || ''}
                        placeholder="Email"
                        required
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <input
                        type="date"
                        name="subscriptionEnd"
                        defaultValue={user.subscriptionEnd ? new Date(user.subscriptionEnd).toISOString().split('T')[0] : ''}
                        placeholder="Premium bis"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          Speichern
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUserId(null)}
                          className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition-all flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Abbrechen
                        </button>
                      </div>
                      {updateState?.error && editingUserId === user.id && (
                        <p className="text-xs text-red-400">{updateState.error}</p>
                      )}
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || user.email || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-medium">
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.name || 'Kein Name'}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  {isPremium(user.subscriptionEnd) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-700/50 text-zinc-400 text-xs font-medium">
                      Free
                    </span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <p className="text-sm text-zinc-300">
                    {formatDate(user.createdAt)}
                  </p>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <p className="text-xs font-mono text-zinc-500">
                    {shortenId(user.id)}
                  </p>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUserId(user.id)}
                      className="p-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isPremium(user.subscriptionEnd) ? (
                      <button
                        onClick={() => setShowRemovePremiumModal(user.id)}
                        className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all"
                        title="Premium entfernen"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPremiumModal(user.id)}
                        className="p-1.5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 hover:text-yellow-300 transition-all"
                        title="Premium setzen"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowPasswordModal(user.id)}
                      className="p-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all"
                      title="Passwort zurücksetzen"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(user.id)}
                      className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Premium setzen</h3>
            <form action={premiumAction} className="space-y-4">
              <input type="hidden" name="userId" value={showPremiumModal} />
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Anzahl Tage
                </label>
                <input
                  type="number"
                  name="days"
                  defaultValue="30"
                  min="1"
                  required
                  className="w-full rounded-md border border-white/10 bg-zinc-800/50 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
              </div>
              {premiumState?.error && (
                <p className="text-sm text-red-400">{premiumState.error}</p>
              )}
              {premiumState?.success && (
                <p className="text-sm text-green-400">{premiumState.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-all"
                >
                  Premium setzen
                </button>
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(null)}
                  className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium entfernen Modal */}
      {showRemovePremiumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Premium entfernen?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Premium-Status wird für diesen User entfernt. Der User verliert sofort den Premium-Zugriff.
            </p>
            <form action={removePremiumAction} className="space-y-4">
              <input type="hidden" name="userId" value={showRemovePremiumModal} />
              {removePremiumState?.error && (
                <p className="text-sm text-red-400">{removePremiumState.error}</p>
              )}
              {removePremiumState?.success && (
                <p className="text-sm text-green-400">{removePremiumState.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all"
                >
                  Premium entfernen
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemovePremiumModal(null)}
                  className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Passwort zurücksetzen</h3>
            <form action={passwordAction} className="space-y-4">
              <input type="hidden" name="userId" value={showPasswordModal} />
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={8}
                  className="w-full rounded-md border border-white/10 bg-zinc-800/50 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {passwordState?.error && (
                <p className="text-sm text-red-400">{passwordState.error}</p>
              )}
              {passwordState?.success && (
                <p className="text-sm text-green-400">{passwordState.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all"
                >
                  Passwort setzen
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">User löschen?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Users werden gelöscht.
            </p>
            <form action={deleteAction} className="space-y-4">
              <input type="hidden" name="userId" value={showDeleteModal} />
              {deleteState?.error && (
                <p className="text-sm text-red-400">{deleteState.error}</p>
              )}
              {deleteState?.success && (
                <p className="text-sm text-green-400">{deleteState.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all"
                >
                  Löschen
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
