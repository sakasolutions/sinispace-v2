'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatSidebar } from '@/components/platform/chat-sidebar';
import { ArrowLeft, Menu } from 'lucide-react';
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
    <div className="flex h-[100dvh] flex-col md:flex-row bg-white overflow-hidden">
      {/* 1. MOBILE HEADER (Nur sichtbar auf Handy, fixed oben) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white z-30 shrink-0 h-14 fixed top-0 left-0 right-0">
        <div className="flex items-center gap-2">
          {/* Zurück-Button (Mobile) */}
          <Link 
            href="/dashboard" 
            className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-600 transition-colors"
            aria-label="Zurück zum Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard" className="font-bold text-lg text-zinc-900">
            Sinispace
          </Link>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600 transition-colors"
          aria-label="Chats öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 2. DESKTOP SIDEBAR (Immer sichtbar, in einer Spalte links) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-zinc-200 md:bg-white md:relative md:h-full">
        {/* Desktop: Zurück-Button oben */}
        <div className="flex items-center gap-2 p-4 border-b border-zinc-200 shrink-0">
          <Link 
            href="/dashboard" 
            className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-600 transition-colors"
            aria-label="Zurück zum Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium text-zinc-600">Zurück</span>
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
      <main className="flex-1 flex flex-col min-w-0 bg-white relative h-full overflow-hidden pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
