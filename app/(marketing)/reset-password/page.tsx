'use client';

import { useState, useEffect, Suspense } from 'react';
import { useActionState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { resetPassword } from '@/actions/auth-actions';
import dynamic from 'next/dynamic';
import { Eye, EyeOff } from 'lucide-react';

const HeroBackground = dynamic(() => import('@/components/ui/hero-background').then(mod => ({ default: mod.HeroBackground })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
    </div>
  ),
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // @ts-ignore
  const [state, formAction] = useActionState(resetPassword, null);

  useEffect(() => {
    if (state?.success) {
      // Nach 3 Sekunden zum Login weiterleiten
      const timer = setTimeout(() => {
        router.push('/login?passwordReset=success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (!token) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-white">
        <HeroBackground showGlows={true} />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm z-10"
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ungültiger Link</h1>
              <p className="text-sm text-gray-600 mb-6">
                Der Reset-Link ist ungültig oder fehlt.
              </p>
              <Link 
                href="/forgot-password"
                className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm px-6 py-3 hover:from-orange-600 hover:to-pink-600 transition-all shadow-md"
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-white">
      <HeroBackground showGlows={true} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-sm z-10"
      >
        {/* LOGO */}
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Neues Passwort setzen</h1>
            <p className="text-sm text-gray-600">
              Wähle ein neues, sicheres Passwort für dein Konto.
            </p>
          </div>

          {/* FORM */}
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="token" value={token} />

            {/* Neues Passwort */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 ml-1" htmlFor="newPassword">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 ml-1">Mindestens 8 Zeichen</p>
            </div>

            {/* Passwort bestätigen */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 ml-1" htmlFor="confirmPassword">
                Passwort bestätigen
              </label>
              <div className="relative">
                <input
                  className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Success/Error Meldung */}
            {state?.success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                {state.message} Du wirst in Kürze zum Login weitergeleitet...
              </div>
            )}
            {state?.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm transition-all hover:from-orange-600 hover:to-pink-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-md"
              type="submit"
              disabled={state?.success}
            >
              {state?.success ? 'Passwort zurückgesetzt' : 'Passwort zurücksetzen'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            <Link href="/login" className="text-gray-900 hover:text-orange-500 font-medium transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-orange-500">
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
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-white">
        <div className="text-gray-600">Lade...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
