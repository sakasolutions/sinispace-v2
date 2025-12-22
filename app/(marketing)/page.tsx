"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

// --- ANIMATION CONFIG ---
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay: delay, ease: "easeOut" },
});

// Marquee Animation für die Helfer-Liste
const marqueeVariants = {
  animate: {
    x: [0, -1035],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: "loop",
        duration: 25,
        ease: "linear",
      },
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden font-sans">
      
      {/* VIBRANT BACKGROUND ACCENTS */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white">
        <div className="absolute top-0 h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>
        <div className="absolute top-[10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-orange-200/40 blur-[120px] mix-blend-multiply"></div>
        <div className="absolute bottom-[10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[120px] mix-blend-multiply"></div>
      </div>

      {/* NAVIGATION BAR */}
      <motion.header 
        className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-zinc-900 group">
            {/* LOGO CONTAINER - Jetzt breiter und ohne 'object-cover' cropping */}
            <div className="relative h-10 w-32 overflow-hidden transition-transform group-hover:scale-105">
                 <Image 
                   src="/assets/logos/logo.webp" 
                   alt="Sinispace Logo" 
                   fill
                   className="object-contain object-left" // 'object-left' sorgt dafür, dass es linksbündig bleibt
                   priority
                 />
            </div>
            {/* TEXT ENTFERNT - Da das Logo wahrscheinlich schon den Namen enthält */}
          </Link>

          <nav className="hidden gap-8 md:flex">
            {['Features', 'Meinungen', 'Preise'].map((item) => (
              <Link 
                key={item}
                href={item === 'Preise' ? '/pricing' : item === 'Features' ? '#features' : '#testimonials'} 
                className="text-sm font-bold text-zinc-500 hover:text-orange-600 transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Login
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/register"
                className="hidden rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 sm:inline-flex"
              >
                Account erstellen
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 text-center md:px-6 relative z-10">
            
            <motion.div
              className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-bold text-zinc-600 shadow-sm hover:border-orange-200 hover:text-orange-600 transition-colors cursor-default"
              {...fadeUp(0.1)}
            >
              <span className="flex h-2 w-2 rounded-full bg-orange-500"></span>
              Prompt Engineering war gestern.
            </motion.div>

            <motion.h1
              className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tighter text-zinc-900 sm:text-7xl md:text-8xl"
              {...fadeUp(0.2)}
            >
              Ergebnisse auf <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent pb-2 inline-block">
                Knopfdruck.
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto mt-8 max-w-[640px] text-lg font-medium text-zinc-500 md:text-xl leading-relaxed"
              {...fadeUp(0.3)}
            >
              Keine Lust auf komplexe Prompts? Sinispace liefert dir fertige KI-Helfer. 
              Klick drauf, fertig. <span className="text-zinc-900 font-bold">Und wenn du doch mal frei chatten willst?</span> Haben wir auch.
            </motion.p>

            <motion.div 
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row" 
              {...fadeUp(0.4)}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/register" 
                  className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-8 py-4 text-base font-bold text-white shadow-xl shadow-zinc-900/20 transition-all hover:bg-orange-600"
                >
                  Kostenlos registrieren
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="#features"
                  className="flex w-full items-center justify-center rounded-xl border-2 border-zinc-100 bg-white px-8 py-4 text-base font-bold text-zinc-900 transition-colors hover:border-zinc-200 hover:bg-zinc-50"
                >
                  So funktioniert's
                </Link>
              </motion.div>
            </motion.div>
          </div>
          
          {/* MARQUEE */}
          <motion.div 
            className="mt-24 w-full overflow-hidden border-y border-zinc-100 bg-zinc-50/50 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative flex w-full overflow-hidden">
               <div className="absolute left-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent"></div>
               <div className="absolute right-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent"></div>
               
               <motion.div className="flex gap-8 whitespace-nowrap" variants={marqueeVariants} animate="animate">
                 {[...Array(2)].map((_, i) => (
                   <div key={i} className="flex gap-8">
                     {["E-Mail Generator", "SEO Optimierer", "Code Review", "Rechtstexte", "Blog Post", "Instagram Caption", "Meeting Protokoll", "Excel Formeln", "Verkaufsstrategie", "Newsletter", "Übersetzung", "Zusammenfassung"].map((text) => (
                       <div key={text} className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 shadow-sm">
                         <span className="mr-2 text-orange-500">⚡️</span> {text}
                       </div>
                     ))}
                   </div>
                 ))}
               </motion.div>
            </div>
          </motion.div>
        </section>

        {/* BENTO GRID */}
        <section id="features" className="w-full py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 md:text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
                Kein Studium nötig.
              </h2>
              <p className="mt-6 text-xl text-zinc-500">
                Wir nehmen dir die technische Last ab. Du drückst den Knopf, die KI macht die Arbeit.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 h-auto md:h-[600px]">
              
              {/* CARD 1: Big Feature */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-2 row-span-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 flex flex-col justify-between overflow-hidden relative group"
              >
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-orange-400/20 to-purple-400/20 blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
                
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-4">Hunderte fertige Helfer.</h3>
                  <p className="text-lg text-zinc-600 max-w-md">
                    Warum Prompts schreiben, wenn wir das schon perfektioniert haben? 
                    Wähle dein Ziel (z.B. "LinkedIn Post"), gib deine Stichpunkte ein, fertig. 
                    Professionelle Ergebnisse ohne Lernkurve.
                  </p>
                </div>

                {/* Simulated UI */}
                <div className="mt-8 grid grid-cols-2 gap-3 opacity-80">
                   <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100 flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">IN</div>
                     <span className="font-bold text-sm text-zinc-800">LinkedIn Viral</span>
                   </div>
                   <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100 flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">XL</div>
                     <span className="font-bold text-sm text-zinc-800">Excel Experte</span>
                   </div>
                   <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100 flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">EM</div>
                     <span className="font-bold text-sm text-zinc-800">Kunden E-Mail</span>
                   </div>
                </div>
              </motion.div>

              {/* CARD 2: Free Chat */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="rounded-3xl border border-zinc-200 bg-white p-8 flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                   <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                   </div>
                   <h3 className="text-xl font-bold text-zinc-900">Freier Chat.</h3>
                   <p className="mt-2 text-sm text-zinc-500">
                     Manchmal willst du die Kontrolle. Nutze unsere ChatGPT-Anbindung (Fair Use) für deine eigenen Ideen.
                   </p>
                </div>
              </motion.div>

              {/* CARD 3: Business Model */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="rounded-3xl border border-zinc-200 bg-zinc-900 p-8 flex flex-col justify-between relative overflow-hidden text-white"
              >
                <div className="absolute top-0 right-0 h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="relative z-10">
                   <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                     <span className="text-xl">🔓</span>
                   </div>
                   <h3 className="text-xl font-bold text-white">Kostenlos anmelden.</h3>
                   <p className="mt-2 text-sm text-zinc-400">
                     Erstell deinen Account unverbindlich. Schau dich im Dashboard um. Premium brauchst du erst für die Power-Features.
                   </p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="w-full py-24 bg-zinc-50 border-t border-zinc-200">
           <div className="container mx-auto px-4 md:px-6">
             <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {[
                 { text: "Ich habe keine Ahnung von 'Prompts'. Hier klicke ich auf 'E-Mail' und es passt. Genial.", author: "Sandra K.", role: "Immobilienmaklerin" },
                 { text: "Die Kombination aus festen Tools und dem freien Chat ist genau das, was mir gefehlt hat.", author: "Timo B.", role: "Agentur Inhaber" },
                 { text: "Super fair, dass man sich erst anmelden und umschauen kann. Das Premium-Upgrade war ein No-Brainer.", author: "Jonas L.", role: "Freelancer" }
               ].map((item, i) => (
                 <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm border border-zinc-100"
                 >
                   <p className="text-zinc-700 font-medium italic">"{item.text}"</p>
                   <div className="mt-6 border-t border-zinc-100 pt-4">
                     <p className="text-sm font-bold text-zinc-900">{item.author}</p>
                     <p className="text-xs text-zinc-400 uppercase tracking-wide">{item.role}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        {/* FAQ */}
        <section className="w-full py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h2 className="text-3xl font-extrabold text-zinc-900 mb-10 text-center">Kurz erklärt.</h2>
            <div className="space-y-4">
              {[
                  { q: "Brauche ich einen API Key?", a: "Nein. Wir stellen die Technik. Du nutzt einfach die App." },
                  { q: "Ist die Anmeldung wirklich kostenlos?", a: "Ja. Die Registrierung ist komplett kostenlos. Du bezahlst erst, wenn du die Premium-Funktionen nutzen möchtest." },
                  { q: "Was bedeutet 'Fair Use' im freien Chat?", a: "Du kannst frei mit der KI schreiben. Wir haben großzügige Limits, damit alle Nutzer performant arbeiten können." }
              ].map((faq, i) => (
                  <div 
                    key={i} 
                    className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-md"
                  >
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">{faq.q}</h3>
                    <p className="mt-2 text-zinc-600">{faq.a}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="w-full py-32 relative overflow-hidden bg-zinc-900 text-white">
           <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
           
           <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
             <motion.h2 
                className="text-4xl font-extrabold tracking-tighter sm:text-6xl mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
             >
               Bereit für das Upgrade?
             </motion.h2>
             <p className="mx-auto max-w-[600px] text-zinc-400 text-xl mb-12">
               Erstelle jetzt deinen Account. Kostenlos. <br />
               Starte in wenigen Sekunden.
             </p>
             <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
             >
               <Link
                  href="/register"
                  className="inline-flex h-16 items-center justify-center rounded-full bg-white px-12 text-lg font-bold text-zinc-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:bg-orange-50"
                >
                  Account erstellen & loslegen
                </Link>
             </motion.div>
             <p className="mt-8 text-sm text-zinc-500">Keine Kreditkarte für die Registrierung nötig.</p>
           </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-100 bg-white py-12">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="flex items-center gap-2">
            {/* LOGO FOOTER */}
            <div className="relative h-8 w-24 overflow-hidden">
               <Image 
                  src="/assets/logos/logo.webp" 
                  alt="Sinispace Logo" 
                  fill
                  className="object-contain object-left"
               />
            </div>
            {/* Auch hier Text entfernen, falls er im Bild ist */}
          </div>
          <p className="text-sm text-zinc-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} Sinispace. Made in Germany.
          </p>
          <div className="flex gap-8">
            <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Impressum</Link>
            <Link href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}