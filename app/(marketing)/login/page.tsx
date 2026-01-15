"use client";

import { useState } from 'react'; // Für Loading-States
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { loginUser } from '@/actions/auth-actions'; // Deine bestehende Action

export default function LoginPage() {
  const router = useRouter();
  // Status für UI-Feedback (Laden, Fehler etc.)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Wir nutzen einen Wrapper um die Server Action, um den Loading-Status zu steuern
  async function handleSubmit(formData: FormData) {
    setStatus('loading');
    setError(null); // Fehler zurücksetzen
    
    try {
      const result = await loginUser(formData);
      
      if (result?.success) {
        // Erfolgreich - manuell zum Dashboard weiterleiten
        router.push('/dashboard');
        router.refresh(); // Session aktualisieren
        return;
      } else {
        // Fehler anzeigen
        setError(result?.error || 'Anmeldung fehlgeschlagen.');
        setStatus('idle');
      }
    } catch (err) {
      // Fallback für unerwartete Fehler
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setStatus('idle');
    }
  }

  return (
    // CONTAINER: Dark Mode (Konsistent mit Landing Page & Register)
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-zinc-950 selection:bg-orange-500/30 selection:text-orange-100">
      
      {/* Background Effects (Grid & Glows) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm z-10"
      >
        {/* LOGO (Home Link) */}
        <div className="mb-8 flex justify-center">
           <Link href="/" className="relative h-12 w-12 overflow-hidden rounded-2xl shadow-lg shadow-orange-500/20 border border-white/10 bg-white hover:scale-105 transition-transform duration-300">
             <Image 
               src="/assets/logos/logo.webp" 
               alt="Sinispace Logo" 
               fill 
               className="object-contain p-1.5" 
               priority 
             />
           </Link>
        </div>

        {/* GLASS CARD */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/5">
          
          <div className="space-y-2 text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">Willkommen zurück</h1>
            <p className="text-sm text-zinc-400">
              Melde dich an, um fortzufahren.
            </p>
          </div>
          
          {/* FORM */}
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1" htmlFor="email">
                E-Mail
              </label>
              <input
                className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all disabled:opacity-50"
                id="email"
                name="email"
                placeholder="name@beispiel.de"
                type="email"
                required
                disabled={status === 'loading'}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor="password">
                  Passwort
                </label>
                {/* Optional: Passwort vergessen Link hier einfügen wenn gewünscht */}
              </div>
              <input
                className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all disabled:opacity-50"
                id="password"
                name="password"
                type="password"
                required
                disabled={status === 'loading'}
              />
            </div>
            
            {/* Fehlermeldung */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            
            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white text-zinc-950 font-bold text-sm transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  Anmelden...
                </span>
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-zinc-500">
            Neu hier?{' '}
            <Link href="/register" className="text-white hover:text-orange-400 font-medium transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-orange-400">
              Konto erstellen
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}