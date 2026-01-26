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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Passwort vergessen?</h1>
            <p className="text-sm text-gray-600">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.
            </p>
          </div>

          {/* FORM */}
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 ml-1" htmlFor="email">
                E-Mail
              </label>
              <input
                className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                id="email"
                name="email"
                placeholder="name@beispiel.de"
                type="email"
                required
              />
            </div>

            {/* Success/Error Meldung */}
            {state?.success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                {state.message}
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
              {state?.success ? 'E-Mail gesendet' : 'Reset-Link senden'}
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
