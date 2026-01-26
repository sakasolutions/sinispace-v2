"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { registerUser } from '@/actions/auth-actions';
import { HeroBackground } from '@/components/ui/hero-background';

export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Verhindert das Standard-Neuladen
    setStatus('loading');

    const formData = new FormData(event.currentTarget);
    
    try {
      setError(null); // Fehler zurücksetzen
      
      // Backend Call (Logik bleibt 1:1 erhalten)
      await registerUser(formData);

      setStatus('success');

      // Redirect nach 2 Sekunden
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      // Fehler anzeigen
      console.error('Register error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Registrieren. Bitte versuche es erneut.';
      setError(errorMessage);
      setStatus('idle');
    }
  }

  return (
    // CONTAINER: Light Theme (Dashboard Design)
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-white">
      
      {/* Hero Background (Grid & Glows) */}
      <HeroBackground showGlows={true} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm z-10"
      >
        {/* LOGO (Home Link) */}
        <div className="mb-8 flex justify-center">
           <Link href="/" className="relative h-12 w-12 overflow-hidden rounded-2xl shadow-md border border-gray-200 bg-white hover:scale-105 transition-transform duration-300">
             <Image 
               src="/assets/logos/logo.webp" 
               alt="Sinispace Logo" 
               fill 
               className="object-contain p-1.5" 
               priority 
             />
           </Link>
        </div>

        {/* CARD - Dashboard Style */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          
          <div className="space-y-2 text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Konto erstellen</h1>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
              Erstelle jetzt dein kostenloses Basiskonto. Wähle im Anschluss deinen Plan, um alle Funktionen freizuschalten.
            </p>
          </div>
          
          {status === 'success' ? (
            // --- SUCCESS STATE ---
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
               <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
               </div>
               <h3 className="text-lg font-bold text-gray-900">Willkommen!</h3>
               <p className="text-sm text-gray-600 mt-2">Leite weiter zum Login...</p>
               
               {/* Progress Bar Animation */}
               <div className="mt-8 flex justify-center">
                 <div className="h-1 w-32 overflow-hidden rounded-full bg-gray-200">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 2, ease: "easeOut" }}
                     className="h-full bg-green-500"
                   />
                 </div>
               </div>
            </motion.div>
          ) : (
            // --- FORM STATE ---
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 ml-1" htmlFor="email">
                  E-Mail
                </label>
                <input
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all disabled:opacity-50"
                  id="email"
                  name="email"
                  placeholder="name@beispiel.de"
                  type="email"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 ml-1" htmlFor="password">
                  Passwort
                </label>
                <input
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all disabled:opacity-50"
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm transition-all hover:from-orange-600 hover:to-pink-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-md"
                type="submit"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Erstelle Account...
                  </span>
                ) : (
                  "Kostenlos registrieren"
                )}
              </button>
            </form>
          )}
          
          {status !== 'success' && (
              <div className="mt-8 text-center text-sm text-gray-600">
              Schon dabei?{' '}
              <Link href="/login" className="text-gray-900 hover:text-orange-500 font-medium transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-orange-500">
                  Einloggen
              </Link>
              </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}