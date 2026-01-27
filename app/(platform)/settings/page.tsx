import { auth } from '@/auth';
import { createCheckoutSession } from '@/actions/payment-actions';
import { signOutAction } from '@/actions/auth-actions';
import { prisma } from '@/lib/prisma';
import { DeleteAccount } from '@/components/platform/delete-account';
import { ChangePassword } from '@/components/platform/change-password';
import { ChangeName } from '@/components/platform/change-name';
import { UsageDashboard } from '@/components/platform/usage-dashboard';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Performance-Optimierung: Email aus Session nutzen (bereits verfügbar)
  // Nur subscriptionEnd, id und name aus DB holen (für Display)
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      id: true,
      email: true, // Fallback falls nicht in Session
      name: true, // Für Anzeige des aktuellen Namens
      subscriptionEnd: true,
    },
  });

  // SICHERHEIT: Email aus Session nutzen (sicherer als DB)
  // Fallback zu DB nur wenn Session keine Email hat (sollte nicht passieren)
  const userEmail = session?.user?.email || user?.email || '';
  const userId = session?.user?.id || user?.id || '';
  const isPro = user?.subscriptionEnd && user.subscriptionEnd > new Date();

  return (
    <div className="max-w-2xl w-full pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Einstellungen</h1>
      <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Verwalte deinen Account und Zugriff.</p>

      {params.success && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5 text-green-800 shadow-sm">
          <strong>Erfolg!</strong> Dein Account wird in Kürze freigeschaltet.
        </div>
      )}
      {params.canceled && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-amber-800 shadow-sm">
          Der Kaufvorgang wurde abgebrochen.
        </div>
      )}

      <div className="mb-4 sm:mb-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mein Profil</h2>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg sm:text-xl shrink-0">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Nutzernamen:</p>
            <p className="text-gray-900 text-sm sm:text-base font-semibold truncate">{user?.name || userEmail}</p>
            <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1">E-Mail:</p>
            <p className="text-gray-900 font-mono text-xs sm:text-sm truncate">{userEmail}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">ID: {userId}</p>
          </div>
        </div>
      </div>

      <ChangeName />

      <div className="mt-4 sm:mt-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Mein Tarif</h2>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Aktueller Status:</p>
            <p className={`text-base sm:text-lg font-bold ${isPro ? 'text-green-600' : 'text-gray-900'}`}>
              {isPro ? 'Premium Aktiv' : 'Kostenloser Account'}
            </p>
            {isPro && user?.subscriptionEnd && (
              <p className="text-xs text-gray-500 mt-1">
                Läuft automatisch ab am: {user.subscriptionEnd.toLocaleDateString()}
              </p>
            )}
          </div>
          {!isPro && (
            <form action={createCheckoutSession} className="shrink-0">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white hover:shadow-lg transition-all shadow-sm"
              >
                Jetzt upgraden (99,90€)
              </button>
            </form>
          )}
        </div>
      </div>

      <ChangePassword />

      {isPro && (
        <div className="mt-4 sm:mt-6">
          <UsageDashboard />
        </div>
      )}

      <div className="mt-4 sm:mt-6 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Abmelden</h2>
        <p className="text-sm text-gray-500 mb-4">
          Melde dich von deinem Account ab. Deine aktive Session wird beendet.
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-all"
          >
            Abmelden
          </button>
        </form>
      </div>

      <DeleteAccount />
    </div>
  );
}