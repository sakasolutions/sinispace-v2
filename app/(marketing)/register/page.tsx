"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { registerUser } from '@/actions/auth-actions';

export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Verhindert das Standard-Neuladen
    setStatus('loading');

    const formData = new FormData(event.currentTarget);
    
    // Backend Call (Logik bleibt 1:1 erhalten)
    await registerUser(formData);

    setStatus('success');

    // Redirect nach 2 Sekunden
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  }

  return (
    // CONTAINER: Dark Mode passend zur Landing Page Hero Section
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Konto erstellen</h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
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
               <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
               </div>
               <h3 className="text-lg font-bold text-white">Willkommen!</h3>
               <p className="text-sm text-zinc-400 mt-2">Leite weiter zum Login...</p>
               
               {/* Progress Bar Animation */}
               <div className="mt-8 flex justify-center">
                 <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
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
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1" htmlFor="password">
                  Passwort
                </label>
                <input
                  className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all disabled:opacity-50"
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              
              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white text-zinc-950 font-bold text-sm transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-[0_0_20px_rgba(255,255,255,0.1)]"
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
              <div className="mt-8 text-center text-sm text-zinc-500">
              Schon dabei?{' '}
              <Link href="/login" className="text-white hover:text-orange-400 font-medium transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-orange-400">
                  Einloggen
              </Link>
              </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}