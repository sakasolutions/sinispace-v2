import { auth } from '@/auth';
import { createCheckoutSession } from '@/actions/payment-actions';
import { signOutAction } from '@/actions/auth-actions';
import { PrismaClient } from '@prisma/client';
import { DeleteAccount } from '@/components/platform/delete-account';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const params = await searchParams;
  
  const db = new PrismaClient();

  const user = await db.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      id: true,
      email: true,
      subscriptionEnd: true,
      lastLoginAt: true,
    },
  });

  const isPro = user?.subscriptionEnd && user.subscriptionEnd > new Date();

  return (
    <div className="max-w-2xl w-full">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Einstellungen</h1>
      <p className="text-sm sm:text-base text-zinc-400 mb-6 sm:mb-8">Verwalte deinen Account und Zugriff.</p>

      {/* STATUS MELDUNGEN */}
      {params.success && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-xl p-4 text-green-400 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <strong>Erfolg!</strong> Dein Account wird in Kürze freigeschaltet.
        </div>
      )}
      {params.canceled && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-xl p-4 text-yellow-400 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          Der Kaufvorgang wurde abgebrochen.
        </div>
      )}

      {/* NEU: ACCOUNT INFO (Damit du weißt, wer du bist) */}
      <div className="mb-4 sm:mb-6 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
         <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Mein Profil</h2>
         <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-lg sm:text-xl border border-white/10 shrink-0">
               👤
            </div>
            <div className="min-w-0 flex-1">
               <p className="text-xs sm:text-sm font-medium text-zinc-400">Angemeldet als:</p>
               <p className="text-white font-mono text-xs sm:text-sm truncate">{user?.email}</p>
               <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 truncate">ID: {user?.id}</p>
            </div>
         </div>
      </div>

      {/* SUBSCRIPTION STATUS CARD */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <h2 className="text-sm sm:text-base font-semibold text-white">Mein Tarif</h2>
        
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-zinc-400">Aktueller Status:</p>
            <p className={`text-base sm:text-lg font-bold ${isPro ? 'text-green-400' : 'text-white'}`}>
              {isPro ? 'Premium Aktiv' : 'Kostenloser Account'}
            </p>
            {isPro && user?.subscriptionEnd && (
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">
                Läuft automatisch ab am: {user.subscriptionEnd.toLocaleDateString()}
              </p>
            )}
          </div>

          {!isPro && (
            <form action={createCheckoutSession} className="shrink-0">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
              >
                Jetzt upgraden (99,90€)
              </button>
            </form>
          )}
        </div>
      </div>

      {/* LOGOUT */}
      <div className="mt-4 sm:mt-6 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Abmelden</h2>
        <p className="text-xs sm:text-sm text-zinc-400 mb-4">
          Melde dich von deinem Account ab. Deine aktive Session wird beendet.
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/30"
          >
            Abmelden
          </button>
        </form>
      </div>

      {/* KONTO LÖSCHEN */}
      <DeleteAccount />
    </div>
  );
}