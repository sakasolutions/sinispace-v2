import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sinispace',
  description: 'Deine Alltags-KI. Minimalistisch und effizient.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="bg-zinc-950 text-white">
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${inter.className} min-h-[100dvh] bg-zinc-950 text-white antialiased relative`}>
        {/* Background Texture - Smoothes CSS-generated Grid Pattern */}
        {/* Mehrschichtiges Pattern für weichere Übergänge auf iPhone */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Layer 1: Weicher Grid-Overlay mit feinem Gradient */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              backgroundRepeat: 'repeat',
              imageRendering: 'crisp-edges',
              WebkitImageRendering: 'optimizeQuality',
            }}
          />
          {/* Layer 2: Zusätzlicher sanfter Radial-Gradient für Tiefe */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              backgroundRepeat: 'repeat',
              imageRendering: 'auto',
              WebkitImageRendering: 'optimizeQuality',
            }}
          />
          {/* Layer 3: Sehr feine Noise-Textur für organic feel */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 0.5px, transparent 0)',
              backgroundSize: '16px 16px',
              backgroundRepeat: 'repeat',
              imageRendering: 'auto',
              WebkitImageRendering: 'optimizeQuality',
            }}
          />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}