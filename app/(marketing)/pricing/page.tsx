"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';

// Animations-Config (Konsistent mit Landing Page)
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: delay, ease: "easeOut" as const },
});

export default function PricingPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-20 overflow-hidden bg-zinc-950 selection:bg-orange-500/30 selection:text-orange-100">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]"></div>
      </div>

      <div className="container px-4 md:px-6 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.h1 
            className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl"
            {...fadeUp(0.1)}
          >
            Ein Preis. Keine Überraschungen.
          </motion.h1>
          <motion.p 
            className="mt-4 max-w-[600px] text-zinc-400 md:text-xl"
            {...fadeUp(0.2)}
          >
            Wir glauben nicht an versteckte Kosten oder Abo-Fallen.
            Du zahlst für ein Jahr Zugriff. Punkt.
          </motion.p>
        </div>

        {/* PRICING CARD */}
        <motion.div 
          className="flex justify-center"
          {...fadeUp(0.3)}
        >
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/5 hover:border-white/20 transition-colors">
            
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
               <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 backdrop-blur-sm">
                 Beliebteste Wahl
               </span>
            </div>

            <div className="flex items-baseline justify-between mb-6">
              <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Jahrespass
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                Einmalzahlung
              </span>
            </div>

            <div className="flex items-baseline text-white">
              <span className="text-5xl font-bold tracking-tight">99,90€</span>
              <span className="ml-2 text-xl font-medium text-zinc-500">
                / Jahr
              </span>
            </div>
            
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Zugang endet automatisch nach 365 Tagen. <br/>Keine Kündigung nötig.
            </p>

            <div className="my-8 h-px w-full bg-white/10"></div>

            <ul className="space-y-4 text-sm text-zinc-300">
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
              className="mt-8 block w-full rounded-xl bg-white px-4 py-3.5 text-center text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Jetzt starten
            </Link>
            
            <p className="mt-4 text-center text-xs text-zinc-500">
              Zahlung via Stripe (Kreditkarte, Apple Pay, Google Pay).
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// Icon Component (angepasst für Dark Mode)
function CheckIcon() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}