"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { registerUser } from '@/actions/auth-actions';
import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

const inputClass =
  'flex h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand-pink/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/25 transition-all disabled:opacity-50';

export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');

    const formData = new FormData(event.currentTarget);

    try {
      setError(null);
      await registerUser(formData);
      setStatus('success');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Registrieren. Bitte versuche es erneut.';
      setError(errorMessage);
      setStatus('idle');
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-dark-bg px-4 text-white selection:bg-brand-pink/30 selection:text-white">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: MARKETING_PAGE_AURORA_BACKGROUND }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-105"
          >
            <Image src="/assets/logos/logo.webp" alt="Sinispace Logo" fill className="object-contain p-1.5" priority />
          </Link>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Konto erstellen</h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/60">
              Erstelle jetzt dein kostenloses Basiskonto. Wähle im Anschluss deinen Plan, um alle Funktionen freizuschalten.
            </p>
          </div>

          {status === 'success' ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Willkommen!</h3>
              <p className="mt-2 text-sm text-white/60">Leite weiter zum Login...</p>
              <div className="mt-8 flex justify-center">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-brand-pink to-brand-orange"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="email">
                  E-Mail
                </label>
                <input
                  className={inputClass}
                  id="email"
                  name="email"
                  placeholder="name@beispiel.de"
                  type="email"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="password">
                  Passwort
                </label>
                <input
                  className={inputClass}
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={status === 'loading'}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              )}

              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-pink to-brand-orange text-base font-bold text-white shadow-glow-pink-orange transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Erstelle Account...
                  </span>
                ) : (
                  'Kostenlos registrieren'
                )}
              </button>
            </form>
          )}

          {status !== 'success' && (
            <div className="mt-8 text-center text-sm text-white/55">
              Schon dabei?{' '}
              <Link
                href="/login"
                className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:text-brand-pink hover:decoration-brand-pink/50"
              >
                Einloggen
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
