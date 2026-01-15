'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChatSidebar } from '@/components/platform/chat-sidebar';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface ChatLayoutWrapperProps {
  children: React.ReactNode;
  userEmail: string;
  isPro: boolean;
}

export function ChatLayoutWrapper({ children, userEmail, isPro }: ChatLayoutWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Sidebar auf Mobile schließen wenn Route wechselt
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-zinc-950 overflow-hidden relative">
      {/* AMBIENT GLOWS - Global für Chat */}
      <div className="fixed -top-20 -left-20 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      
      {/* 1. MOBILE HEADER (Nur sichtbar auf Handy, fixed oben) */}
      <div className="md:hidden flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl z-30 shrink-0 h-14 fixed top-0 left-0 right-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo (Mobile) */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 group"
            aria-label="Zurück zum Dashboard"
          >
            <div className="relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-lg shadow-lg shadow-orange-500/10 border border-white/10 bg-white transition-transform duration-300">
              <Image 
                src="/assets/logos/logo.webp" 
                alt="Sinispace Logo" 
                fill 
                className="object-contain p-1" 
                priority 
              />
            </div>
          </Link>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 sm:p-2 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
          aria-label="Chats öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 2. DESKTOP SIDEBAR (Immer sichtbar, in einer Spalte links) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-white/5 md:bg-zinc-950/50 md:backdrop-blur-xl md:relative md:h-full">
        {/* Desktop: Logo oben */}
        <div className="flex h-16 items-center border-b border-white/5 px-4 sm:px-6 shrink-0">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 group"
            aria-label="Zum Dashboard"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-orange-500/10 border border-white/10 bg-white hover:scale-105 transition-transform duration-300">
              <Image 
                src="/assets/logos/logo.webp" 
                alt="Sinispace Logo" 
                fill 
                className="object-contain p-1" 
                priority 
              />
            </div>
          </Link>
        </div>
        
        {/* ChatSidebar für Desktop (immer offen, relative, volle Höhe) */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ChatSidebar isOpen={true} onClose={() => {}} userEmail={userEmail} isPro={isPro} />
        </div>
      </aside>

      {/* 3. MOBILE SIDEBAR (Overlay mit fixed positioning) */}
      <div className="md:hidden">
        <ChatSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          userEmail={userEmail} 
          isPro={isPro} 
        />
      </div>

      {/* 4. MAIN CONTENT (Der Chat Bereich) */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
