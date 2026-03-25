"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: delay, ease: 'easeOut' as const },
});

export default function PricingPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-dark-bg py-20 text-white selection:bg-brand-pink/30 selection:text-white">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: MARKETING_PAGE_AURORA_BACKGROUND }}
        aria-hidden
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="mb-16 flex flex-col items-center text-center">
          <motion.h1
            className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl"
            {...fadeUp(0.1)}
          >
            Ein Preis. Keine Überraschungen.
          </motion.h1>
          <motion.p className="mt-4 max-w-[600px] text-white/65 md:text-xl" {...fadeUp(0.2)}>
            Wir glauben nicht an versteckte Kosten oder Abo-Fallen. Du zahlst für ein Jahr Zugriff. Punkt.
          </motion.p>
        </div>

        <motion.div className="flex justify-center" {...fadeUp(0.3)}>
          <div className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-white/15">
            <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
              <span className="inline-flex animate-pulse items-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                SPARE 55%
              </span>
            </div>

            <div className="mb-6 flex items-baseline justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-white/70">Jahrespass</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/65">
                Einmalzahlung
              </span>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg font-medium text-white/45 line-through decoration-red-400/50 decoration-2">
                  219,90 €
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight text-white">99,90€</span>
                <span className="text-lg font-medium text-white/55">/ Jahr</span>
              </div>

              <p className="mt-2 text-xs text-white/45">Weniger als 0,30€ pro Tag bei einem Jahr Nutzung.</p>
            </div>

            <p className="mb-4 text-sm font-medium leading-relaxed text-brand-orange/90">
              Nur für kurze Zeit verfügbar. Danach steigt der Preis.
            </p>

            <p className="mb-6 text-sm leading-relaxed text-white/60">
              Zugang endet automatisch nach 365 Tagen. <br />
              Keine Kündigung nötig.
            </p>

            <div className="my-8 h-px w-full bg-white/10" />

            <ul className="space-y-4 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <CheckIcon /> <span>Unbegrenzter Zugriff auf Actions</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon /> <span>Fair Use Chat (GPT-4o / Claude Level)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon /> <span>30-Tage Auto-Löschung der Chats</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon /> <span>Priority Support</span>
              </li>
            </ul>

            <Link
              href="/register"
              className="mt-8 block w-full rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-4 py-3.5 text-center text-sm font-bold text-white shadow-glow-pink-orange transition-all hover:scale-[1.02]"
            >
              Jetzt Zugang sichern
            </Link>

            <p className="mt-4 text-center text-xs text-white/45">Zahlung via Stripe (Kreditkarte, Apple Pay, Google Pay).</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-pink/20 text-brand-pink">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}
