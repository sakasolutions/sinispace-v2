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
    <header 
      className="fixed top-0 left-0 right-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo - Links */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group" onClick={() => setIsMenuOpen(false)}>
          <div className="relative h-8 w-8 sm:h-9 sm:w-9 overflow-hidden rounded-xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] border border-white/60 bg-white/90 hover:scale-105 transition-transform duration-300 shrink-0">
            <Image 
              src="/assets/logos/logo.webp" 
              alt="Sinispace Logo" 
              fill 
              className="object-contain p-1" 
              priority 
              sizes="36px"
            />
          </div>
          <span className="hidden sm:inline text-slate-900 font-semibold text-lg tracking-tight">SiniSpace</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" prefetch={true} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Login</Link>
          <Link href="/register" className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-[0_8px_24px_-4px_rgba(15,23,42,0.35)]">
            Kostenlos starten
          </Link>
        </div>

        {/* Mobile Actions - Login Button + Burger Menu */}
        <div className="md:hidden flex items-center gap-2">
          <Link 
            href="/login"
            prefetch={true}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200/80 text-slate-700 hover:bg-white/80 transition-colors shrink-0"
          >
            Anmelden
          </Link>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="text-slate-700 p-2 hover:bg-white/60 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white/90 backdrop-blur-xl border-b border-white/40 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)} 
                  className="block text-slate-700 font-medium text-lg hover:text-slate-900 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <div className="h-px bg-gray-200/60 my-4" />
              <Link 
                href="/register" 
                onClick={() => setIsMenuOpen(false)} 
                className="block w-full text-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-[0_8px_24px_-4px_rgba(15,23,42,0.3)]"
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
    <div className="min-h-screen text-slate-900 font-sans selection:bg-rose-200/60 selection:text-slate-900">
      <Header />
      
      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-[95vh] flex flex-col justify-center">
          
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={mounted && !prefersReducedMotion ? { scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12], x: [0, 40, 0] } : {}} 
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-1/4 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-orange-400/25 blur-[100px]" 
            />
            <motion.div 
              animate={mounted && !prefersReducedMotion ? { scale: [1, 1.12, 1], opacity: [0.1, 0.18, 0.1], x: [0, -40, 0] } : {}} 
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-0 right-1/4 h-[520px] w-[520px] rounded-full bg-rose-300/20 blur-[100px]" 
            />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div {...fadeConfigs.badge} className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/55 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Dein Alltag. Perfekt organisiert.
            </motion.div>

            <motion.h1 
              {...fadeConfigs.title} 
              className="mx-auto max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.08]"
              style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
            >
              Schluss mit der Frage:
              <br />
              <span className="text-slate-900">Was essen wir heute?</span>
            </motion.h1>

            <motion.p {...fadeConfigs.sub} className="mx-auto mt-8 max-w-2xl text-lg text-slate-600 md:text-xl leading-relaxed">
              SiniSpace ist die intelligente Lösung für gestresste Paare und Eltern. Automatische Wochenpläne, smarte Einkaufslisten und weniger Mental Load.
            </motion.p>

            <motion.div {...fadeConfigs.btn} className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row max-w-xl mx-auto">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                <Link 
                  href="/register" 
                  className="flex items-center justify-center w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-base md:text-lg hover:bg-slate-800 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-8"
                >
                  Kostenlos starten
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                <Link 
                  href="#features" 
                  className="flex items-center justify-center w-full md:w-auto h-12 px-8 text-slate-600 text-sm font-semibold mt-0 md:mt-0 hover:text-slate-900 transition-colors"
                >
                  So funktioniert&apos;s
                </Link>
              </motion.div>
            </motion.div>

            {/* Visual Proof - Mockup-Karte */}
            <motion.div 
              initial={mounted ? { opacity: 0, y: 60 } : { opacity: 1, y: 0 }}
              whileInView={mounted ? { opacity: 1, y: 0 } : {}}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-16 md:mt-24 mx-auto max-w-4xl px-4"
            >
               <motion.div 
                 animate={mounted && !prefersReducedMotion ? { y: [0, -10, 0] } : {}}
                 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                 className="relative rounded-3xl border border-white/50 bg-white/50 backdrop-blur-md p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden"
                 style={{
                   maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                   WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                 } as React.CSSProperties}
               >
                  <div className="rounded-2xl bg-white/90 border border-gray-100 overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
                     <div className="h-12 border-b border-gray-100 bg-rose-50/40 flex items-center px-4 gap-2">
                        <div className="h-3 w-3 rounded-full bg-rose-300/50"></div>
                        <div className="h-3 w-3 rounded-full bg-orange-200/60"></div>
                        <div className="h-3 w-3 rounded-full bg-emerald-200/50"></div>
                        <div className="ml-4 h-6 w-1/3 bg-gray-100 rounded-full"></div>
                     </div>
                     <div className="p-6 md:p-10 min-h-[300px] flex flex-col justify-end space-y-6">
                        <div className="flex gap-4">
                           <div className="h-10 w-10 rounded-[14px] bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md shrink-0">IQ</div>
                           <div className="bg-slate-50 border border-gray-100 p-4 rounded-2xl rounded-tl-none text-slate-700 text-sm max-w-[85%] leading-relaxed">
                              Dein Wochenplan steht: Mo–So mit Abendessen-Ideen, Kalorien grob und passenden Bildern. Soll ich die Einkaufsliste für SmartCart vorbereiten?
                           </div>
                        </div>
                        <div className="flex gap-4 flex-row-reverse">
                           <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-500 text-xs shrink-0">Ihr</div>
                           <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl rounded-tr-none text-rose-900 text-sm max-w-[85%] leading-relaxed">
                              Ja – und bitte Vorrats-Check, was wir schon zu Hause haben.
                           </div>
                        </div>
                        <div className="h-14 w-full bg-slate-50/80 rounded-xl border border-gray-100 flex items-center px-4 gap-4">
                           <div className="h-2 w-full bg-gray-100 rounded-full"></div>
                           <div className="h-10 w-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-rose-50/80 via-transparent to-transparent pointer-events-none z-10"></div>
        </section>

        {/* --- MARQUEE --- */}
        <section className="bg-white/40 backdrop-blur-sm border-y border-white/50 py-10 relative overflow-hidden z-20">
           <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-rose-50/90 to-transparent z-10"></div>
           <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-rose-50/90 to-transparent z-10"></div>
           <motion.div 
             className="flex gap-8" 
             animate={mounted && !prefersReducedMotion ? getMarqueeAnimation(false) : {}}
           >
             {[...Array(2)].map((_, i) => (
               <div key={i} className="flex gap-8 whitespace-nowrap">
                 {["CookIQ Wochenplan", "SmartCart Listen", "Vorrats-Check", "Kalender & Essen", "KI-Rezepte", "Familien-Portionen", "Einkauf nach Gang", "Weniger Food Waste", "Premium Wochenplan", "Aktiv in den Kalender"].map((text) => (
                   <div key={`${i}-${text}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-100 bg-white/80 backdrop-blur-md text-slate-700 font-medium text-sm hover:border-rose-200 hover:text-rose-600 transition-colors cursor-default shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
                     <span className="text-orange-500">✦</span> {text}
                   </div>
                 ))}
               </div>
             ))}
           </motion.div>
        </section>

        {/* --- FEATURES (Tier-1 Glass) --- */}
        <section id="features" className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-orange-400/8 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-rose-300/10 rounded-full blur-[100px] -z-10"></div>
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <motion.div className="mb-12 md:text-center max-w-3xl mx-auto" {...fadeUp(0.1)}>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6 text-slate-900">
                Essen, Einkauf, Kalender – zusammen gedacht.
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                CookIQ plant, SmartCart organisiert, der Kalender hält alle Termine und Mahlzeiten im Blick. Weniger Chaos im Familienalltag.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CookIQ */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-3xl border border-white/50 bg-white/55 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] transition-all p-6 md:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-[14px] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-md shadow-orange-500/25 text-white text-lg font-bold">
                    🍳
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">CookIQ</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    KI-Wochenplan und Rezept-Generator: Vorlieben, Zeit und Ernährung einstellen – fertige Ideen für die ganze Woche.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cookiqChips.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-gray-100 text-xs font-medium text-slate-700"
                      >
                        <span aria-hidden>{c.icon}</span>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/tools/recipe"
                  className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors mt-4"
                >
                  Zu CookIQ <span aria-hidden>&rarr;</span>
                </Link>
              </motion.div>

              {/* SmartCart */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-3xl border border-white/50 bg-white/55 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] transition-all p-6 md:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-[14px] bg-rose-500 flex items-center justify-center mb-4 shadow-md shadow-rose-500/25 text-white text-lg">
                    🛒
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">SmartCart</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Intelligente Einkaufsliste mit Vorrats-Check: aus dem Wochenplan direkt in sortierte Listen – wie du im Markt läufst.
                  </p>
                  <div className="space-y-2 mb-4">
                    {smartcartBullets.map((line) => (
                      <div key={line} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href="/tools/shopping-list"
                  className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors mt-4"
                >
                  Zu SmartCart <span aria-hidden>&rarr;</span>
                </Link>
              </motion.div>

              {/* Kalender + CTA */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-3xl border border-white/50 bg-white/55 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] transition-all p-6 md:p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-[14px] bg-slate-800 flex items-center justify-center mb-4 shadow-md text-white text-lg">
                    📆
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Kalender</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Nahtlose Termin- und Essensplanung: Wochenplan aktivieren, Mahlzeiten landen automatisch an den richtigen Tagen.
                  </p>
                  <div className="space-y-2 mb-4">
                    {calendarBullets.map((line) => (
                      <div key={line} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-700 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 mt-auto">
                  <Link
                    href="/calendar"
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-slate-950 transition-colors"
                  >
                    Zum Kalender <span aria-hidden>&rarr;</span>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-[0_8px_24px_-4px_rgba(15,23,42,0.3)]"
                  >
                    Kostenlos starten
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- TRUST & SAFETY --- */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 w-[360px] h-[360px] bg-emerald-400/8 rounded-full blur-[90px] -z-10"></div>
            <div className="absolute bottom-1/2 right-1/4 w-[360px] h-[360px] bg-slate-300/10 rounded-full blur-[90px] -z-10"></div>
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-3xl border border-white/50 bg-white/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.05)] overflow-hidden relative p-8 md:p-12"
              >
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                      Sicher & verantwortungsvoll
                    </h3>
                    <p className="text-base text-slate-600 leading-relaxed mb-6">
                      Wir nutzen <span className="font-semibold text-slate-900">GPT-4o</span> von OpenAI mit integrierten Safety-Features. 
                      Sensible Themen werden automatisch gefiltert – für dich und deine Familie.
                    </p>
                    
                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-1">Automatisches Content-Filtering</p>
                          <p className="text-xs text-slate-600">OpenAI blockiert problematische Inhalte automatisch</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-1">Moderation aktiv</p>
                          <p className="text-xs text-slate-600">Eingaben und Ausgaben werden geprüft</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-1">DSGVO-konform</p>
                          <p className="text-xs text-slate-600">Deine Daten bleiben in Europa geschützt</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-1">Kein Training mit deinen Daten</p>
                          <p className="text-xs text-slate-600">Deine Pläne und Listen werden nicht zum KI-Training genutzt</p>
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
        <section id="testimonials" className="py-24 border-t border-white/50 bg-white/30 backdrop-blur-sm">
           <div className="container mx-auto px-4 md:px-6">
             <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Aus dem echten Familienalltag.</h2>
             </div>
             <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {testimonialData.map((item, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }} className="flex flex-col justify-between rounded-3xl bg-white/70 backdrop-blur-md p-8 shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100/80">
                   <div className="flex gap-1 mb-4 text-rose-400">{[1,2,3,4,5].map(s => <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
                   <p className="text-slate-700 font-medium italic mb-6 leading-relaxed">&ldquo;{item.text}&rdquo;</p>
                   <div className="mt-auto pt-6 border-t border-gray-100">
                     <p className="text-sm font-bold text-slate-900">{item.author}</p>
                     <p className="text-xs text-slate-500 uppercase tracking-wide">{item.role}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        {/* --- PRICING TEASER --- */}
        <section className="py-24 border-t border-white/50 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto rounded-3xl bg-slate-900 px-6 py-16 md:py-20 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.45)] relative overflow-hidden border border-white/10">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[280px] w-[480px] bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>
               <div className="relative z-10">
                 <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ein Zugang. Faire Konditionen.</h2>
                 <p className="text-lg text-white/85 max-w-2xl mx-auto mb-10 leading-relaxed">Kein Monats-Stress: Jahreszugang für SiniSpace – CookIQ, SmartCart und alle KI-Helfer im Blick. Details und Fair-Use siehst du auf der Preisseite.</p>
                 <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold text-lg hover:bg-rose-50 transition-all shadow-lg">Preismodell ansehen <span aria-hidden>&rarr;</span></Link>
                 <p className="mt-6 text-xs text-white/70 uppercase tracking-widest font-medium">Fair Use • 14 Tage Geld-zurück</p>
               </div>
            </motion.div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-32">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center tracking-tight">Kurz erklärt.</h2>
            <div className="space-y-4">
              {faqData.map((faq, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <details className="group rounded-2xl border border-gray-100 bg-white/70 backdrop-blur-md open:border-gray-200 open:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300 overflow-hidden">
                      <summary className="flex cursor-pointer items-center justify-between p-6 font-bold text-slate-900 list-none hover:bg-white/90 transition-colors">{faq.q}<span className="transition-transform duration-300 group-open:rotate-180 text-slate-400">▼</span></summary>
                      <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-gray-100 pt-4 text-sm bg-rose-50/20">{faq.a}</div>
                    </details>
                  </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="relative py-28 md:py-36 bg-slate-900 overflow-hidden text-center border-t border-white/10">
           <div className="absolute inset-0 opacity-[0.07]"><div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div></div>
           <div className="container mx-auto px-4 relative z-10">
             <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight">Weniger Stress. Besser essen.</motion.h2>
             <p className="mx-auto max-w-[560px] text-white/85 text-lg md:text-xl mb-12 leading-relaxed">Kostenlos registrieren, CookIQ & SmartCart entdecken. <br className="hidden sm:block" />Premium, wenn du den Wochenplan voll nutzen willst.</p>
             <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="inline-block">
               <Link href="/register" className="inline-flex h-14 md:h-16 items-center justify-center rounded-xl bg-white px-10 md:px-12 text-base md:text-lg font-bold text-slate-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] hover:bg-rose-50 transition-colors">Kostenlos starten</Link>
             </motion.div>
             <p className="mt-8 text-sm text-white/65">Keine Kreditkarte für die Registrierung nötig.</p>
           </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/50 bg-white/50 backdrop-blur-md py-12">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-2">
             <div className="relative h-10 w-40">
               <Image 
                 src="/assets/logos/logo-full.webp" 
                 alt="SiniSpace Logo" 
                 fill 
                 className="object-contain object-left"
                 loading="lazy"
                 sizes="160px"
               />
             </div>
          </div>
          <p className="text-sm text-slate-500 text-center md:text-left">&copy; {new Date().getFullYear()} SiniSpace. Made in Germany.</p>
          <div className="flex gap-8">
            <Link href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Impressum</Link>
            <Link href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}