"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

// --- CONFIG & DATA ---

const toolsColumn1 = [
  { icon: "IN", label: "LinkedIn Viral", color: "text-blue-600 bg-blue-50" },
  { icon: "SEO", label: "SEO Analyse", color: "text-green-600 bg-green-50" },
  { icon: "JS", label: "Code Fixer", color: "text-yellow-600 bg-yellow-50" },
  { icon: "BLOG", label: "Blog Artikel", color: "text-purple-600 bg-purple-50" },
  { icon: "ADS", label: "Ad Copy", color: "text-pink-600 bg-pink-50" },
];

const toolsColumn2 = [
  { icon: "XL", label: "Excel Formel", color: "text-emerald-600 bg-emerald-50" },
  { icon: "§", label: "Rechtstext", color: "text-zinc-600 bg-zinc-100" },
  { icon: "TR", label: "Übersetzer", color: "text-indigo-600 bg-indigo-50" },
  { icon: "SUM", label: "Summary", color: "text-cyan-600 bg-cyan-50" },
  { icon: "BIO", label: "Bio Gen", color: "text-rose-600 bg-rose-50" },
];

const faqData = [
  { 
    q: "Wie lange werden meine Daten gespeichert?", 
    a: "Wir praktizieren strikte Datensparsamkeit. Deine Chat-Verläufe und generierten Texte werden maximal 30 Tage gespeichert, damit du Zugriff darauf hast. Danach werden sie automatisch und unwiderruflich von unseren Servern gelöscht." 
  },
  { 
    q: "Nutzt ihr meine Eingaben zum KI-Training?", 
    a: "Nein. Deine Daten gehören dir. Wir nutzen deine Eingaben und Ergebnisse explizit NICHT, um unsere KI-Modelle zu trainieren. Deine Geschäftsgeheimnisse bleiben sicher." 
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
  { text: "Ich habe keine Ahnung von 'Prompts'. Hier klicke ich auf 'E-Mail' und es passt. Genial.", author: "Sandra K.", role: "Immobilienmaklerin" },
  { text: "Die Kombination aus festen Tools und dem freien Chat ist genau das, was mir gefehlt hat.", author: "Timo B.", role: "Agentur Inhaber" },
  { text: "Super fair, dass man sich erst anmelden und umschauen kann. Das Premium-Upgrade war ein No-Brainer.", author: "Jonas L.", role: "Freelancer" }
];

// --- ANIMATION CONFIG ---
// CSS-basierte Animationen für bessere Performance (kein JS-Bundle nötig)
const fadeUpCSS = "animate-[fadeUp_0.6s_ease-out_forwards] opacity-0";

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
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigation Items
  const navItems = [
    { name: "Features", href: "#features" },
    { name: "Meinungen", href: "#testimonials" },
    { name: "FAQ", href: "#faq" },
    { name: "Preis", href: "/pricing" }, // Link zur Pricing Page
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isMenuOpen ? "bg-zinc-950/90 backdrop-blur-md border-b border-white/10" : "bg-transparent border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsMenuOpen(false)}>
           <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-orange-500/10 border border-white/10 bg-white hover:scale-105 transition-transform duration-300">
             <Image 
               src="/assets/logos/logo.webp" 
               alt="Sinispace Logo" 
               fill 
               className="object-contain p-1" 
               priority 
               sizes="36px"
             />
           </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-white hover:text-white/80 transition-colors">Login</Link>
          <Link href="/register" className="px-5 py-2.5 rounded-full bg-white text-zinc-950 text-sm font-bold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            Kostenlos starten
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-2">
          {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-zinc-950 border-b border-zinc-800 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)} 
                  className="block text-zinc-300 font-medium text-lg"
                >
                  {item.name}
                </Link>
              ))}
              <div className="h-px bg-zinc-800 my-4" />
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block text-white font-medium">Login</Link>
              <Link href="/register" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-3 bg-white text-zinc-950 rounded-xl font-bold">
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
    <div className="min-h-screen bg-zinc-950 text-zinc-900 font-sans selection:bg-orange-500/30 selection:text-orange-100">
      <Header />
      
      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-zinc-950 min-h-[95vh] flex flex-col justify-center">
          
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <motion.div 
              animate={mounted && !prefersReducedMotion ? { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0] } : {}} 
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-1/4 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[120px]" 
            />
            <motion.div 
              animate={mounted && !prefersReducedMotion ? { scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], x: [0, -50, 0] } : {}} 
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px]" 
            />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div {...fadeConfigs.badge} className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Prompt Engineering war gestern.
            </motion.div>

            <motion.h1 {...fadeConfigs.title} className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tighter text-white sm:text-7xl md:text-8xl leading-[1.1]">
              Ergebnisse auf <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent pb-2 inline-block">
                Knopfdruck.
              </span>
            </motion.h1>

            <motion.p {...fadeConfigs.sub} className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl leading-relaxed">
              Keine Lust auf komplexe Prompts? Sinispace liefert dir fertige KI-Helfer. 
              Klick drauf, fertig. <span className="text-zinc-100 font-bold">Und wenn du doch mal frei chatten willst?</span> Haben wir auch.
            </motion.p>

            <motion.div {...fadeConfigs.btn} className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/register" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-zinc-950 font-bold text-lg hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                  Kostenlos registrieren
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="#features" className="flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-xl border border-zinc-700 bg-zinc-900/50 text-white font-bold hover:bg-zinc-800 transition-all backdrop-blur-sm">
                  So funktioniert's
                </Link>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={mounted ? { opacity: 0, y: 60 } : { opacity: 1, y: 0 }}
              whileInView={mounted ? { opacity: 1, y: 0 } : {}}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-24 mx-auto max-w-4xl"
            >
               <motion.div 
                 animate={mounted && !prefersReducedMotion ? { y: [0, -10, 0] } : {}}
                 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                 className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-2 shadow-2xl ring-1 ring-white/5"
               >
                  <div className="rounded-xl bg-zinc-950/80 border border-white/5 overflow-hidden">
                     <div className="h-12 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500/20"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500/20"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500/20"></div>
                        <div className="ml-4 h-6 w-1/3 bg-white/5 rounded-full"></div>
                     </div>
                     <div className="p-6 md:p-10 min-h-[300px] flex flex-col justify-end space-y-6">
                        <div className="flex gap-4">
                           <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">AI</div>
                           <div className="bg-zinc-800/80 border border-zinc-700 p-4 rounded-2xl rounded-tl-none text-zinc-300 text-sm max-w-[85%] leading-relaxed shadow-sm">
                              Hier ist dein fertiger LinkedIn Post zum Thema "SaaS Growth". Soll ich noch passende Hashtags hinzufügen?
                           </div>
                        </div>
                        <div className="flex gap-4 flex-row-reverse">
                           <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs border border-zinc-700">DU</div>
                           <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl rounded-tr-none text-orange-200 text-sm max-w-[85%] leading-relaxed">
                              Ja, bitte generiere 5 relevante Hashtags.
                           </div>
                        </div>
                        <div className="h-14 w-full bg-zinc-900 rounded-xl border border-zinc-800 flex items-center px-4 gap-4 shadow-inner">
                           <div className="h-2 w-full bg-zinc-800/50 rounded"></div>
                           <div className="h-10 w-10 bg-orange-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none z-10"></div>
        </section>

        {/* --- MARQUEE --- */}
        <section className="bg-zinc-950 border-y border-white/5 py-10 relative overflow-hidden z-20">
           <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
           <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10"></div>
           <motion.div 
             className="flex gap-8" 
             animate={mounted && !prefersReducedMotion ? getMarqueeAnimation(false) : {}}
           >
             {[...Array(2)].map((_, i) => (
               <div key={i} className="flex gap-8 whitespace-nowrap">
                 {["LinkedIn Viral", "SEO Analyse", "Code Review", "Rechtstexte", "Blog Post", "Instagram Caption", "Meeting Protokoll", "Excel Formeln", "Sales E-Mail", "Zusammenfassung"].map((text) => (
                   <div key={text} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 font-medium text-sm hover:border-orange-500/30 hover:text-orange-400 transition-colors cursor-default">
                     <span className="text-orange-500">⚡️</span> {text}
                   </div>
                 ))}
               </div>
             ))}
           </motion.div>
        </section>

        {/* --- FEATURES (Premium Glass Bubble) --- */}
        <section id="features" className="py-20 bg-zinc-950 text-white relative overflow-hidden">
          {/* Hintergrund-Glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] -z-10"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] -z-10"></div>
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <motion.div className="mb-12 md:text-center max-w-3xl mx-auto" {...fadeUp(0.1)}>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6 text-white">
                Kein Studium nötig.
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed">
                Wir nehmen dir die technische Last ab. Du drückst den Knopf, die KI macht die Arbeit.
              </p>
            </motion.div>

            {/* 3-Karten Grid - Premium Glass Bubble */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* KARTE 1: Hunderte fertige Helfer */}
              <motion.div 
                whileHover={{ scale: 1.02 }} 
                className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden relative transition-transform p-6 md:p-8 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 leading-tight">
                    Hunderte <br/>
                    <span className="text-zinc-400">fertige Helfer.</span>
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Wähle dein Ziel, gib Stichpunkte ein, fertig. Professionelle Ergebnisse ohne Lernkurve.
                  </p>
                  
                  {/* Stichwortartige Helfer-Beispiele */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {toolsColumn1.slice(0, 4).map((tool, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-xs font-medium text-zinc-300"
                      >
                        <span className="text-[10px] font-bold text-orange-400">{tool.icon}</span>
                        {tool.label}
                      </span>
                    ))}
                   </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <Link href="/register" className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-all">
                    Alle Tools ansehen <span>&rarr;</span>
                  </Link>
                </div>
              </motion.div>

              {/* KARTE 2: Freier Chat */}
              <motion.div 
                whileHover={{ scale: 1.02 }} 
                className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden relative transition-transform p-6 md:p-8 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Freier Chat.</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Manchmal willst du die Kontrolle. Nutze unsere ChatGPT-Anbindung (Fair Use) für deine eigenen Ideen.
                  </p>
                  
                  {/* Mehrwert: Features */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Code, Tabellen & Struktur</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Chat-Verlauf gespeichert</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <Link href="/chat" className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-all">
                    Jetzt chatten <span>&rarr;</span>
                  </Link>
                </div>
              </motion.div>

              {/* KARTE 3: Kostenlos anmelden (CTA) */}
              <motion.div 
                whileHover={{ scale: 1.02 }} 
                className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden relative transition-transform p-6 md:p-8 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/20 border border-orange-400/30 backdrop-blur-sm flex items-center justify-center mb-4">
                    <span className="text-2xl">🔓</span>
                  </div>
                   <h3 className="text-2xl font-bold text-white mb-3">Kostenlos anmelden.</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Erstell deinen Account unverbindlich. Schau dich im Dashboard um. Premium brauchst du erst für die Power-Features.
                  </p>
                  
                  {/* Mehrwert: Was du bekommst */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Kostenloses Basiskonto</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Alle Features testen</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <Link 
                    href="/register" 
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
                  >
                    Kostenlos starten
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- TRUST & SAFETY --- */}
        <section className="py-20 bg-zinc-950 text-white relative overflow-hidden">
          {/* Hintergrund-Glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute bottom-1/2 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden relative p-8 md:p-12"
              >
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="h-14 w-14 rounded-2xl bg-green-500/20 border border-green-400/30 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                      Sicher & Verantwortungsvoll
                    </h3>
                    <p className="text-base text-zinc-300 leading-relaxed mb-6">
                      Wir nutzen <span className="font-bold text-white">GPT-4o</span> von OpenAI mit integrierten Safety-Features. 
                      Sensible Themen werden automatisch gefiltert – für deine Sicherheit und die unserer Community.
                    </p>
                    
                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Automatisches Content-Filtering</p>
                          <p className="text-xs text-zinc-400">OpenAI blockiert problematische Inhalte automatisch</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Moderation-API aktiv</p>
                          <p className="text-xs text-zinc-400">Eingaben und Ausgaben werden geprüft</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">DSGVO-konform</p>
                          <p className="text-xs text-zinc-400">Deine Daten bleiben sicher und geschützt</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Kein Training mit deinen Daten</p>
                          <p className="text-xs text-zinc-400">Deine Inhalte werden nicht zum KI-Training genutzt</p>
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
        <section id="testimonials" className="py-24 bg-zinc-50 border-t border-zinc-200">
           <div className="container mx-auto px-4 md:px-6">
             <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-zinc-900">Von Profis genutzt.</h2>
             </div>
             <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {testimonialData.map((item, i) => (
                 <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.02 }} className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm border border-zinc-200/60">
                   <div className="flex gap-1 mb-4 text-orange-400">{[1,2,3,4,5].map(s => <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
                   <p className="text-zinc-700 font-medium italic mb-6 leading-relaxed">"{item.text}"</p>
                   <div className="mt-auto pt-6 border-t border-zinc-100">
                     <p className="text-sm font-bold text-zinc-900">{item.author}</p>
                     <p className="text-xs text-zinc-400 uppercase tracking-wide">{item.role}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        {/* --- PRICING TEASER --- */}
        <section className="py-24 bg-white border-t border-zinc-100 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto rounded-[2.5rem] bg-zinc-950 px-6 py-20 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[300px] w-[500px] bg-purple-500/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-purple-500/30 transition-colors duration-700"></div>
               <div className="relative z-10">
                 <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ein Zugang. Keine monatlichen Kosten.</h2>
                 <p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed">Wir glauben nicht an komplizierte Abo-Modelle oder versteckte Gebühren. Hol dir den Jahrespass für Sinispace und nutze die Power von zwei Top-KIs ohne Limits.</p>
                 <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-zinc-950 font-bold text-lg hover:bg-zinc-200 hover:scale-105 transition-all shadow-lg shadow-white/10">Preismodell ansehen <span>&rarr;</span></Link>
                 <p className="mt-6 text-xs text-zinc-500 uppercase tracking-widest font-medium">Fair Use Policy • 14 Tage Geld-zurück</p>
               </div>
            </motion.div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-32 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-extrabold text-zinc-900 mb-12 text-center">Kurz erklärt.</h2>
            <div className="space-y-4">
              {faqData.map((faq, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <details className="group rounded-2xl border border-zinc-200 bg-white open:border-zinc-300 open:shadow-md transition-all duration-300 overflow-hidden">
                      <summary className="flex cursor-pointer items-center justify-between p-6 font-bold text-zinc-900 list-none hover:bg-zinc-50 transition-colors">{faq.q}<span className="transition-transform duration-300 group-open:rotate-180 text-zinc-400">▼</span></summary>
                      <div className="px-6 pb-6 text-zinc-600 leading-relaxed border-t border-zinc-100 pt-4 text-sm bg-zinc-50/30">{faq.a}</div>
                    </details>
                  </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="relative py-40 bg-zinc-950 overflow-hidden text-center">
           <div className="absolute inset-0 opacity-20"><div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div></div>
           <div className="container mx-auto px-4 relative z-10">
             <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tighter">Bereit für das Upgrade?</motion.h2>
             <p className="mx-auto max-w-[600px] text-zinc-400 text-xl mb-12">Erstelle jetzt deinen Account. Kostenlos. <br className="hidden sm:block"/>Starte in wenigen Sekunden.</p>
             <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
               <Link href="/register" className="inline-flex h-16 items-center justify-center rounded-full bg-white px-12 text-lg font-bold text-zinc-950 shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:bg-zinc-200 transition-colors">Account erstellen & loslegen</Link>
             </motion.div>
             <p className="mt-8 text-sm text-zinc-500">Keine Kreditkarte für die Registrierung nötig.</p>
           </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-zinc-100 bg-white py-12">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-2">
             <div className="relative h-10 w-40">
               <Image 
                 src="/assets/logos/logo-full.webp" 
                 alt="Sinispace Logo Full" 
                 fill 
                 className="object-contain object-left"
                 loading="lazy"
                 sizes="160px"
               />
             </div>
          </div>
          <p className="text-sm text-zinc-500 text-center md:text-left">&copy; {new Date().getFullYear()} Sinispace. Made in Germany.</p>
          <div className="flex gap-8">
            <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Impressum</Link>
            <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}