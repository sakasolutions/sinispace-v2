'use client';

import { useState, useEffect, Suspense } from 'react';
import { useActionState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { resetPassword } from '@/actions/auth-actions';
import { Eye, EyeOff } from 'lucide-react';
import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

const inputClass =
  'flex h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 pr-10 text-sm text-white placeholder:text-white/40 focus:border-brand-pink/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/25 transition-all';

const shellClass =
  'relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-dark-bg px-4 py-12 text-white selection:bg-brand-pink/30 selection:text-white';

function AuroraBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{ background: MARKETING_PAGE_AURORA_BACKGROUND }}
      aria-hidden
    />
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction] = useActionState(resetPassword, null);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/login?passwordReset=success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (!token) {
    return (
      <div className={shellClass}>
        <AuroraBackdrop />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm"
        >
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-white">Ungültiger Link</h1>
              <p className="mb-6 text-sm text-white/60">Der Reset-Link ist ungültig oder fehlt.</p>
              <Link
                href="/forgot-password"
                className="inline-block rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-6 py-3 text-sm font-bold text-white shadow-glow-pink-orange transition-all hover:scale-[1.02]"
              >
                Neuen Link anfordern
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <AuroraBackdrop />

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
            <h1 className="text-2xl font-bold tracking-tight text-white">Neues Passwort setzen</h1>
            <p className="text-sm text-white/60">Wähle ein neues, sicheres Passwort für dein Konto.</p>
          </div>

          <form action={formAction} className="space-y-5">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="newPassword">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="ml-1 text-[10px] text-white/45">Mindestens 8 Zeichen</p>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="confirmPassword">
                Passwort bestätigen
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Passwort wiederholen"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {state?.success && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {state.message} Du wirst in Kürze zum Login weitergeleitet...
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
              {state?.success ? 'Passwort zurückgesetzt' : 'Passwort zurücksetzen'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={shellClass}>
          <AuroraBackdrop />
          <div className="relative z-10 text-white/60">Lade...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
