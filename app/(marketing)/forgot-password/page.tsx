'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { requestPasswordReset } from '@/actions/auth-actions';
import dynamic from 'next/dynamic';

const HeroBackground = dynamic(() => import('@/components/ui/hero-background').then(mod => ({ default: mod.HeroBackground })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
    </div>
  ),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  // @ts-ignore
  const [state, formAction] = useActionState(requestPasswordReset, null);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-zinc-950 selection:bg-orange-500/30 selection:text-orange-100">
      <HeroBackground showGlows={true} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-sm z-10"
      >
        {/* LOGO */}
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Passwort vergessen?</h1>
            <p className="text-sm text-zinc-400">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.
            </p>
          </div>

          {/* FORM */}
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1" htmlFor="email">
                E-Mail
              </label>
              <input
                className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                id="email"
                name="email"
                placeholder="name@beispiel.de"
                type="email"
                required
              />
            </div>

            {/* Success/Error Meldung */}
            {state?.success && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                {state.message}
              </div>
            )}
            {state?.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {state.error}
              </div>
            )}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white text-zinc-950 font-bold text-sm transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              type="submit"
              disabled={state?.success}
            >
              {state?.success ? 'E-Mail gesendet' : 'Reset-Link senden'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500">
            <Link href="/login" className="text-white hover:text-orange-400 font-medium transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-orange-400">
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
