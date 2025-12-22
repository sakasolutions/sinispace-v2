"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/actions/auth-actions'; // Deine Action

export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Verhindert das Standard-Neuladen
    setStatus('loading');

    const formData = new FormData(event.currentTarget);
    
    // Wir rufen das Backend auf
    // WICHTIG: Die Action darf jetzt nicht mehr redirecten, sondern muss { success: true } zurückgeben!
    await registerUser(formData);

    // Backend ist fertig -> Wir zeigen Erfolg an
    setStatus('success');

    // Wir warten 2 Sekunden, damit der User die Meldung lesen kann
    setTimeout(() => {
      router.push('/login'); // JETZT leiten wir weiter
    }, 2000);
  }

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 bg-white text-zinc-900">
      {/* Zurück-Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Zurück
      </Link>

      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 p-8 shadow-sm bg-white transition-all">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Konto erstellen</h1>
          <p className="text-sm text-zinc-500">
            Starte mit Sinispace. Lokal & Sicher.
          </p>
        </div>
        
        {/* LOGIK: Entweder Erfolgsmeldung ODER Formular */}
        {status === 'success' ? (
          // --- ERFOLGS-ANSICHT ---
          <div className="animate-in fade-in zoom-in duration-300 py-8 text-center">
             <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
             </div>
             <h3 className="text-lg font-bold text-zinc-900">Konto erstellt!</h3>
             <p className="text-sm text-zinc-500 mt-2">Du wirst zum Login weitergeleitet...</p>
             <div className="mt-6 flex justify-center">
               {/* Lade-Indikator nur für Optik */}
               <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                 <div className="h-full w-full origin-left animate-[grow_2s_ease-out_forwards] bg-green-500"></div>
               </div>
             </div>
          </div>
        ) : (
          // --- FORMULAR-ANSICHT ---
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                E-Mail
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all disabled:opacity-50"
                id="email"
                name="email"
                placeholder="name@beispiel.de"
                type="email"
                required
                disabled={status === 'loading'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Passwort
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all disabled:opacity-50"
                id="password"
                name="password"
                type="password"
                required
                disabled={status === 'loading'}
              />
            </div>
            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-8 text-sm font-medium text-zinc-50 transition-all hover:bg-zinc-800 hover:shadow-lg disabled:opacity-70 disabled:cursor-wait"
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  Erstelle Account...
                </span>
              ) : (
                "Registrieren"
              )}
            </button>
          </form>
        )}
        
        {status !== 'success' && (
            <div className="text-center text-sm text-zinc-500">
            Schon dabei?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-zinc-900 font-medium">
                Einloggen
            </Link>
            </div>
        )}
      </div>
    </div>
  );
}