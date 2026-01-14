import { auth } from '@/auth';
import { createCheckoutSession } from '@/actions/payment-actions';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '@/components/platform/session-manager';
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
  });

  const isPro = user?.subscriptionEnd && user.subscriptionEnd > new Date();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900">Einstellungen</h1>
      <p className="text-zinc-500 mb-8">Verwalte deinen Account und Zugriff.</p>

      {/* STATUS MELDUNGEN */}
      {params.success && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700 border border-green-200">
          <strong>Erfolg!</strong> Dein Account wird in Kürze freigeschaltet.
        </div>
      )}
      {params.canceled && (
        <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-700 border border-yellow-200">
          Der Kaufvorgang wurde abgebrochen.
        </div>
      )}

      {/* NEU: ACCOUNT INFO (Damit du weißt, wer du bist) */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
         <h2 className="font-semibold text-zinc-900 mb-4">Mein Profil</h2>
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-xl border border-zinc-200">
               👤
            </div>
            <div>
               <p className="text-sm font-medium text-zinc-900">Angemeldet als:</p>
               <p className="text-zinc-500 font-mono text-sm">{user?.email}</p>
               <p className="text-xs text-zinc-400 mt-1">ID: {user?.id}</p>
            </div>
         </div>
      </div>

      {/* SUBSCRIPTION STATUS CARD */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Mein Tarif</h2>
        
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Aktueller Status:</p>
            <p className={`text-lg font-bold ${isPro ? 'text-green-600' : 'text-zinc-900'}`}>
              {isPro ? 'Premium Aktiv' : 'Kostenloser Account'}
            </p>
            {isPro && user?.subscriptionEnd && (
              <p className="text-xs text-zinc-400 mt-1">
                Läuft automatisch ab am: {user.subscriptionEnd.toLocaleDateString()}
              </p>
            )}
          </div>

          {!isPro && (
            <form action={async () => {
              await createCheckoutSession();
            }}>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                Jetzt upgraden (99,90€)
              </button>
            </form>
          )}
        </div>
      </div>

      {/* SESSION MANAGEMENT */}
      <div className="mt-6">
        <SessionManager />
      </div>

      {/* KONTO LÖSCHEN */}
      <DeleteAccount />
    </div>
  );
}