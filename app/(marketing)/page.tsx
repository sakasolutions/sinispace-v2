"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

// --- CONFIG & DATA ---

/** Kleine Tags unter CookIQ-Karte */
const cookiqChips = [
  { icon: "🍳", label: "Wochenplan" },
  { icon: "✨", label: "KI-Rezepte" },
  { icon: "🥗", label: "Vorlieben" },
  { icon: "📅", label: "Kalender" },
];

/** SmartCart-Highlights */
const smartcartBullets = ["Eine Liste, alle Märkte", "Vorrats-Check vor dem Einkauf", "Kategorien wie im Supermarkt"];

/** Kalender-Highlights */
const calendarBullets = ["Essen & Termine an einem Ort", "Plan aktivieren → nächste Woche", "Weniger Koordination im Alltag"];

const faqData = [
  { 
    q: "Wie lange werden meine Daten gespeichert?", 
    a: "Wir praktizieren strikte Datensparsamkeit. Deine Chat-Verläufe und generierten Texte werden maximal 30 Tage gespeichert, damit du Zugriff darauf hast. Danach werden sie automatisch und unwiderruflich von unseren Servern gelöscht." 
  },
  { 
    q: "Nutzt ihr meine Eingaben zum KI-Training?", 
    a: "Nein. Deine Daten gehören dir. Wir nutzen deine Eingaben und Ergebnisse explizit NICHT, um unsere KI-Modelle zu trainieren – weder für CookIQ noch für andere Funktionen." 
  },
  { 
    q: "Sind die Ergebnisse urheberrechtlich geschützt?", 
    a: "Du erhältst die vollen Nutzungsrechte an allen generierten Texten. Du kannst sie uneingeschränkt kommerziell für deine Projekte, Kunden oder Social Media nutzen." 
  },
  { 
    q: "Ist das DSGVO-konform?", 
    a: "Ja. Wir arbeiten nach strengen europäischen Datenschutzstandards. Transparenz und Sicherheit stehen an erster Stelle, weshalb wir auch auf unnötige Cookies und Tracker verzichten." 
  },
  { 
    q: "Habe ich eine Kündigungsfrist?", 
    a: "Nein, denn es gibt keine automatische Verlängerung. Du buchst einen Jahreszugang (12 Monate), der automatisch endet. Du musst nicht kündigen und tappst in keine Abo-Falle." 
  }
];

const testimonialData = [
  { text: "Endlich keine Diskussion mehr am Sonntagabend: Wochenplan steht, Einkaufsliste ist sortiert. CookIQ spart uns jeden Streit.", author: "Michael R.", role: "Familienvater" },
  { text: "SmartCart mit Vorrats-Check ist der Gamechanger – wir kaufen nichts doppelt und vergessen nichts mehr.", author: "Lea & Tom S.", role: "Berufstätiges Paar" },
  { text: "Kalender und Essensplan an einem Ort. Premium hat sich gelohnt, weniger Mental Load nach der Arbeit.", author: "Julia K.", role: "Zwei Kinder, Vollzeit" },
];

/** Eine durchgehende Aurora über die volle Scroll-Höhe (absolute inset-0 am Page-Wrapper). */
const PAGE_AURORA_BACKGROUND = `
  radial-gradient(ellipse 130% 55% at 50% -5%, rgba(88, 42, 82, 0.28) 0%, transparent 42%),
  radial-gradient(ellipse 70% 40% at 8% 22%, rgba(168, 85, 247, 0.09) 0%, transparent 48%),
  radial-gradient(ellipse 65% 38% at 92% 28%, rgba(130, 70, 150, 0.1) 0%, transparent 46%),
  radial-gradient(ellipse 90% 45% at 18% 58%, rgba(100, 55, 120, 0.08) 0%, transparent 50%),
  radial-gradient(ellipse 85% 42% at 82% 62%, rgba(110, 60, 130, 0.09) 0%, transparent 48%),
  radial-gradient(ellipse 110% 50% at 50% 88%, rgba(65, 32, 62, 0.16) 0%, transparent 48%),
  radial-gradient(ellipse 95% 40% at 50% 102%, rgba(45, 22, 48, 0.12) 0%, transparent 45%),
  linear-gradient(180deg, #181020 0%, #0f0914 22%, #0f0914 55%, #0b0710 100%)
`;

// --- ANIMATION CONFIG ---
const fadeUp = (delay = 0, reducedMotion = false) => ({
  initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: reducedMotion ? { duration: 0 } : { duration: 0.6, delay: delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
});

const getMarqueeAnimation = (reducedMotion: boolean) => {
  if (reducedMotion) return {};
  return {
    x: [0, -1035] as [number, number],
    transition: {
      x: { 
        repeat: Infinity, 
        repeatType: "loop" as const, 
        duration: 40, 
        ease: "linear" as const 
      } as const,
    } as const,
  };
};

// --- ICONS ---
const MenuIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-8 6h8" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

// --- HEADER COMPONENT ---
function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Navigation Items
  const navItems = [
    { name: "Features", href: "#features" },
    { name: "Meinungen", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
    { name: "Preis", href: "/pricing" }, // Link zur Pricing Page
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-dark-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 sm:gap-3" onClick={() => setIsMenuOpen(false)}>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5 sm:h-9 sm:w-9">
            <Image
              src="/assets/logos/logo.webp"
              alt="Sinispace Logo"
              fill
              className="object-contain p-1"
              priority
              sizes="36px"
            />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight text-white sm:inline">SiniSpace</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className="text-sm font-medium text-white/70 transition-colors hover:text-white">
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" prefetch={true} className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-5 py-2.5 text-sm font-bold text-white shadow-glow-pink-orange transition-transform hover:scale-105"
          >
            Kostenlos starten
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/login"
            prefetch={true}
            className="shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
          >
            Anmelden
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10 bg-dark-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-4 p-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-lg font-medium text-white/90 transition-colors hover:text-white"
                >
                  {item.name}
                </Link>
              ))}
              <div className="my-4 h-px bg-white/10" />
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full rounded-full bg-gradient-to-r from-brand-pink to-brand-orange py-3 text-center font-bold text-white shadow-glow-pink-orange"
              >
                Kostenlos starten
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// --- MAIN PAGE ---

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion() ?? false;
  
  // Defer Animationen bis nach dem ersten Render
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Memoized configs
  const fadeConfigs = useMemo(() => ({
    badge: fadeUp(0.1, prefersReducedMotion || !mounted),
    title: fadeUp(0.2, prefersReducedMotion || !mounted),
    sub: fadeUp(0.3, prefersReducedMotion || !mounted),
    btn: fadeUp(0.4, prefersReducedMotion || !mounted),
  }), [prefersReducedMotion, mounted]);

  return (
    <div className="relative min-h-screen bg-dark-bg font-sans text-white selection:bg-brand-pink/30 selection:text-white">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: PAGE_AURORA_BACKGROUND }}
        aria-hidden
      />

      <Header />

      <main className="relative z-10">
        {/* --- HERO: Inhalt über globaler Aurora; kein extra starker lokaler Glow --- */}
        <section className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-28">
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
            <motion.h1
              {...fadeConfigs.title}
              className="text-balance text-center text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl"
              style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
            >
              SiniSpace macht den Alltag lecker.
            </motion.h1>

            <motion.p
              {...fadeConfigs.sub}
              className="mx-auto mt-10 max-w-2xl text-pretty text-center text-lg leading-relaxed text-white/60 md:mt-12"
            >
              Wochenplan, Einkauf und Termine – vorgefertigte KI-Helfer ohne Prompt-Stress. Mehr Ruhe, weniger Koordination.
            </motion.p>

            <motion.div
              {...fadeConfigs.btn}
              className="mx-auto mt-14 flex max-w-xl flex-col items-center justify-center gap-4 md:mt-16 md:flex-row"
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-8 py-4 text-lg font-bold text-white shadow-glow-pink-orange transition-transform hover:scale-105"
              >
                Kostenlos starten
              </Link>
              <Link
                href="#features"
                className="text-sm font-semibold text-white/50 transition-colors hover:text-white/90"
              >
                So funktioniert&apos;s
              </Link>
            </motion.div>

            <motion.div
              initial={mounted ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
              whileInView={mounted ? { opacity: 1, y: 0 } : {}}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-20 max-w-lg md:mt-24"
            >
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-left shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Vorschau</p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-white">Glassmorphism Surface</p>
                <p className="mt-4 text-sm leading-relaxed text-white/55">
                  So wirken Karten & Panels in der neuen Oberfläche – weiche Kanten, Tiefe, sanfte Aurora im Hintergrund.
                </p>
                <div className="mt-6 flex gap-2">
                  <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-brand-pink/60 to-brand-orange/60" />
                  <span className="h-2 w-12 rounded-full bg-white/10" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- MARQUEE --- */}
        <section className="relative z-20 overflow-hidden border-y border-white/10 bg-white/[0.03] py-10 backdrop-blur-sm">
           <div className="absolute bottom-0 left-0 top-0 z-10 w-32 bg-gradient-to-r from-dark-bg to-transparent" />
           <div className="absolute bottom-0 right-0 top-0 z-10 w-32 bg-gradient-to-l from-dark-bg to-transparent" />
           <motion.div 
             className="flex gap-8" 
             animate={mounted && !prefersReducedMotion ? getMarqueeAnimation(false) : {}}
           >
             {[...Array(2)].map((_, i) => (
               <div key={i} className="flex gap-8 whitespace-nowrap">
                 {["CookIQ Wochenplan", "SmartCart Listen", "Vorrats-Check", "Kalender & Essen", "KI-Rezepte", "Familien-Portionen", "Einkauf nach Gang", "Weniger Food Waste", "Premium Wochenplan", "Aktiv in den Kalender"].map((text) => (
                   <div key={`${i}-${text}`} className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/10 bg-dark-surface px-6 py-3 text-sm font-medium text-white/75 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] backdrop-blur-md transition-colors hover:border-brand-pink/30 hover:text-white">
                     <span className="text-brand-orange">✦</span> {text}
                   </div>
                 ))}
               </div>
             ))}
           </motion.div>
        </section>

        {/* --- FEATURES (Tier-1 Glass) --- */}
        <section id="features" className="relative overflow-hidden py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-1/4 -z-10 h-[420px] w-[420px] rounded-full bg-brand-orange/10 blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 -z-10 h-[420px] w-[420px] rounded-full bg-brand-pink/10 blur-[100px]" />
          </div>

          <div className="relative z-10 container mx-auto px-4 md:px-6">
            <motion.div className="mx-auto mb-12 max-w-3xl md:text-center" {...fadeUp(0.1)}>
              <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Fertige Lösungen auf Knopfdruck.
              </h2>
              <p className="text-xl leading-relaxed text-white/60">
                Warum stundenlang mit Prompts kämpfen? SiniSpace bietet dir ein stetig wachsendes Arsenal an smarten Helfern für dein tägliches Leben.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CookIQ */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex flex-col justify-between rounded-3xl border border-dark-border bg-dark-surface p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-white/15 hover:shadow-[0_12px_48px_rgba(0,0,0,0.45)] md:p-8"
              >
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-orange-500 to-amber-500 text-lg font-bold text-white shadow-md shadow-orange-500/25">
                    🍳
                  </div>
                  <h3 className="mb-3 text-2xl font-bold leading-tight text-white">CookIQ</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    KI-Wochenplan und Rezept-Generator: Vorlieben, Zeit und Ernährung einstellen – fertige Ideen für die ganze Woche.
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {cookiqChips.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/75"
                      >
                        <span aria-hidden>{c.icon}</span>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/tools/recipe"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-orange transition-colors hover:text-orange-300"
                >
                  Zu CookIQ <span aria-hidden>&rarr;</span>
                </Link>
              </motion.div>

              {/* SmartCart */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex flex-col justify-between rounded-3xl border border-dark-border bg-dark-surface p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-white/15 hover:shadow-[0_12px_48px_rgba(0,0,0,0.45)] md:p-8"
              >
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-pink text-lg text-white shadow-md shadow-rose-500/25">
                    🛒
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">SmartCart</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    Intelligente Einkaufsliste mit Vorrats-Check: aus dem Wochenplan direkt in sortierte Listen – wie du im Markt läufst.
                  </p>
                  <div className="mb-4 space-y-2">
                    {smartcartBullets.map((line) => (
                      <div key={line} className="flex items-center gap-2 text-xs text-white/55">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-brand-pink">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href="/tools/shopping-list"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-pink transition-colors hover:text-fuchsia-300"
                >
                  Zu SmartCart <span aria-hidden>&rarr;</span>
                </Link>
              </motion.div>

              {/* Kalender + CTA */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex flex-col justify-between rounded-3xl border border-dark-border bg-dark-surface p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:border-white/15 hover:shadow-[0_12px_48px_rgba(0,0,0,0.45)] md:p-8"
              >
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/10 text-lg text-white shadow-md">
                    📆
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">Kalender</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    Nahtlose Termin- und Essensplanung: Wochenplan aktivieren, Mahlzeiten landen automatisch an den richtigen Tagen.
                  </p>
                  <div className="mb-4 space-y-2">
                    {calendarBullets.map((line) => (
                      <div key={line} className="flex items-center gap-2 text-xs text-white/55">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-brand-purple">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-auto space-y-3">
                  <Link
                    href="/calendar"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white/90 transition-colors hover:text-white"
                  >
                    Zum Kalender <span aria-hidden>&rarr;</span>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-pink to-brand-orange px-6 py-3 text-sm font-bold text-white shadow-[0_8px_28px_-4px_rgba(236,72,153,0.45)] transition-all hover:opacity-95"
                  >
                    Kostenlos starten
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- TRUST & SAFETY --- */}
        <section className="relative overflow-hidden py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-1/2 -z-10 h-[360px] w-[360px] rounded-full bg-emerald-400/10 blur-[90px]" />
            <div className="absolute bottom-1/2 right-1/4 -z-10 h-[360px] w-[360px] rounded-full bg-brand-purple/15 blur-[90px]" />
          </div>

          <div className="relative z-10 container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl border border-dark-border bg-dark-surface p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12"
              >
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="mb-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
                      Sicher & verantwortungsvoll
                    </h3>
                    <p className="mb-6 text-base leading-relaxed text-white/65">
                      Wir nutzen <span className="font-semibold text-white">GPT-4o</span> von OpenAI mit integrierten Safety-Features. 
                      Sensible Themen werden automatisch gefiltert – für dich und deine Familie.
                    </p>
                    
                    {/* Features Grid */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-emerald-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="mb-1 text-sm font-medium text-white">Automatisches Content-Filtering</p>
                          <p className="text-xs text-white/55">OpenAI blockiert problematische Inhalte automatisch</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-emerald-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="mb-1 text-sm font-medium text-white">Moderation aktiv</p>
                          <p className="text-xs text-white/55">Eingaben und Ausgaben werden geprüft</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-emerald-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="mb-1 text-sm font-medium text-white">DSGVO-konform</p>
                          <p className="text-xs text-white/55">Deine Daten bleiben in Europa geschützt</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-emerald-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="mb-1 text-sm font-medium text-white">Kein Training mit deinen Daten</p>
                          <p className="text-xs text-white/55">Deine Pläne und Listen werden nicht zum KI-Training genutzt</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section id="testimonials" className="border-t border-white/10 bg-white/[0.02] py-24 backdrop-blur-sm">
           <div className="container mx-auto px-4 md:px-6">
             <div className="mb-16 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white">Gebaut für echte Zeitsparer.</h2>
             </div>
             <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {testimonialData.map((item, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }} className="flex flex-col justify-between rounded-3xl border border-dark-border bg-dark-surface p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                   <div className="mb-4 flex gap-1 text-brand-orange">{[1,2,3,4,5].map(s => <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
                   <p className="mb-6 font-medium italic leading-relaxed text-white/75">&ldquo;{item.text}&rdquo;</p>
                   <div className="mt-auto border-t border-white/10 pt-6">
                     <p className="text-sm font-bold text-white">{item.author}</p>
                     <p className="text-xs uppercase tracking-wide text-white/45">{item.role}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        {/* --- PRICING TEASER --- */}
        <section className="relative overflow-hidden border-t border-white/10 py-24">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-dark-bg to-brand-purple/20 px-6 py-16 text-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] md:py-20">
               <div className="pointer-events-none absolute left-1/2 top-0 h-[280px] w-[480px] -translate-x-1/2 rounded-full bg-brand-pink/15 blur-[80px]" />
               <div className="relative z-10">
                 <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-5xl">Ein Zugang. Faire Konditionen.</h2>
                 <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/80">Kein Monats-Stress: Jahreszugang für SiniSpace – CookIQ, SmartCart und alle KI-Helfer im Blick. Details und Fair-Use siehst du auf der Preisseite.</p>
                 <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-8 py-4 text-lg font-bold text-white shadow-[0_0_30px_rgba(236,72,153,0.35)] transition-transform hover:scale-105">Preismodell ansehen <span aria-hidden>&rarr;</span></Link>
                 <p className="mt-6 text-xs text-white/70 uppercase tracking-widest font-medium">Fair Use • 14 Tage Geld-zurück</p>
               </div>
            </motion.div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-32">
          <div className="container mx-auto max-w-3xl px-4 md:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white">Kurz erklärt.</h2>
            <div className="space-y-4">
              {faqData.map((faq, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <details className="group overflow-hidden rounded-2xl border border-dark-border bg-dark-surface backdrop-blur-xl transition-all duration-300 open:border-white/15 open:shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
                      <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-bold text-white transition-colors hover:bg-white/[0.04]">{faq.q}<span className="text-white/40 transition-transform duration-300 group-open:rotate-180">▼</span></summary>
                      <div className="border-t border-white/10 bg-white/[0.02] px-6 pb-6 pt-4 text-sm leading-relaxed text-white/65">{faq.a}</div>
                    </details>
                  </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="relative overflow-hidden border-t border-white/10 bg-dark-bg py-28 text-center md:py-36">
           <div className="absolute inset-0 opacity-[0.06]"><div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" /></div>
           <div className="relative z-10 container mx-auto px-4">
             <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">Weniger Stress. Besser essen.</motion.h2>
             <p className="mx-auto mb-12 max-w-[560px] text-lg leading-relaxed text-white/80 md:text-xl">Kostenlos registrieren, CookIQ & SmartCart entdecken. <br className="hidden sm:block" />Premium, wenn du den Wochenplan voll nutzen willst.</p>
             <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="inline-block">
               <Link href="/register" className="inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-brand-pink to-brand-orange px-10 text-base font-bold text-white shadow-[0_0_36px_rgba(236,72,153,0.4)] transition-transform hover:scale-105 md:h-16 md:px-12 md:text-lg">Kostenlos starten</Link>
             </motion.div>
             <p className="mt-8 text-sm text-white/65">Keine Kreditkarte für die Registrierung nötig.</p>
           </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-white/10 bg-dark-surface/40 py-12 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-2">
             <div className="relative h-10 w-40">
               <Image 
                 src="/assets/logos/logo-full.webp" 
                 alt="SiniSpace Logo" 
                 fill 
                 className="object-contain object-left brightness-0 invert"
                 loading="lazy"
                 sizes="160px"
               />
             </div>
          </div>
          <p className="text-center text-sm text-white/45 md:text-left">&copy; {new Date().getFullYear()} SiniSpace. Made in Germany.</p>
          <div className="flex gap-8">
            <Link href="#" className="text-sm font-medium text-white/55 transition-colors hover:text-white">Impressum</Link>
            <Link href="#" className="text-sm font-medium text-white/55 transition-colors hover:text-white">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}