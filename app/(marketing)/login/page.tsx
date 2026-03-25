"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { loginUser } from '@/actions/auth-actions';
import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

const inputClass =
  'flex h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand-pink/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/25 transition-all disabled:opacity-50';

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus('loading');
    setError(null);

    try {
      const result = await loginUser(formData);

      if (result?.success) {
        router.push('/dashboard');
        router.refresh();
        return;
      } else {
        setError(result?.error || 'Anmeldung fehlgeschlagen.');
        setStatus('idle');
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setStatus('idle');
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-dark-bg px-4 py-12 text-white selection:bg-brand-pink/30 selection:text-white">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: MARKETING_PAGE_AURORA_BACKGROUND }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-105"
          >
            <Image src="/assets/logos/logo.webp" alt="SiniSpace Logo" fill className="object-contain p-1.5" priority />
          </Link>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl md:p-12">
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Willkommen zurück</h1>
            <p className="text-sm text-white/60">Melde dich an – CookIQ, SmartCart und dein Kalender warten.</p>
          </div>

          <form action={handleSubmit} className="space-y-5">
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
              <div className="ml-1 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="password">
                  Passwort
                </label>
                <Link href="/forgot-password" className="text-xs text-white/55 transition-colors hover:text-brand-pink">
                  Passwort vergessen?
                </Link>
              </div>
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
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-pink to-brand-orange text-base font-bold text-white shadow-glow-pink-orange transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Anmelden...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/55">
            Neu hier?{' '}
            <Link
              href="/register"
              className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:text-brand-pink hover:decoration-brand-pink/50"
            >
              Konto erstellen
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
