'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useActionState } from 'react';
import { requestPasswordReset } from '@/actions/auth-actions';
import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

const inputClass =
  'flex h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand-pink/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/25 transition-all';

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, null);

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
            <h1 className="text-2xl font-bold tracking-tight text-white">Passwort vergessen?</h1>
            <p className="text-sm text-white/60">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.</p>
          </div>

          <form action={formAction} className="space-y-5">
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
              />
            </div>

            {state?.success && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {state.message}
              </div>
            )}
            {state?.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{state.error}</div>
            )}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-pink to-brand-orange text-sm font-bold text-white shadow-glow-pink-orange transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={state?.success}
            >
              {state?.success ? 'E-Mail gesendet' : 'Reset-Link senden'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/55">
            <Link
              href="/login"
              className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:text-brand-pink hover:decoration-brand-pink/50"
            >
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
