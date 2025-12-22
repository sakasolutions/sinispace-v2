'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Fixed Navbar Wrapper */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo - Links */}
          <Link href="/" className="flex items-center">
            <div className="relative h-10 w-32">
              <Image
                src="/assets/logos/logo.webp"
                alt="Sinispace Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation - Mitte */}
          <nav className="hidden gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Meinungen
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Preise
            </Link>
          </nav>

          {/* Desktop Navigation - Rechts */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-zinc-900 text-white px-5 py-2 rounded-full hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              Account erstellen
            </Link>
          </div>

          {/* Mobile Hamburger Button - Rechts im Flex-Flow */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Beginnt direkt unter der 64px hohen Navbar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white md:hidden">
          <div className="flex flex-col px-4 py-8 space-y-6">
            <Link
              href="#features"
              onClick={closeMobileMenu}
              className="text-base font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#testimonials"
              onClick={closeMobileMenu}
              className="text-base font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Meinungen
            </Link>
            <Link
              href="/pricing"
              onClick={closeMobileMenu}
              className="text-base font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Preise
            </Link>
            <div className="pt-4 border-t border-zinc-200 space-y-4">
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="block text-base font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className="block bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-colors text-base font-medium text-center"
              >
                Account erstellen
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

