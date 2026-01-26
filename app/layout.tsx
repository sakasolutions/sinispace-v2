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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // Light status bar für light theme
    title: 'Sinispace',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // App-feeling: kein Zoom
  viewportFit: 'cover', // iPhone notches
  height: 'device-height', // Full coverage
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full bg-white" style={{ 
      margin: 0, 
      padding: 0,
      height: '100%',
      minHeight: '100dvh',
      overscrollBehaviorY: 'none',
      overscrollBehaviorX: 'none',
      WebkitOverflowScrolling: 'touch',
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
      scrollBehavior: 'smooth',
    } as React.CSSProperties}>
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${inter.className} bg-white text-gray-900 antialiased relative`} style={{ 
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'none',
        overscrollBehaviorX: 'none',
        scrollBehavior: 'smooth',
        margin: 0,
        padding: 0,
        minHeight: '100dvh',
        height: '100%',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      } as React.CSSProperties}>
        {/* Cinematic Background Stack - Theme-aware */}
        
        {/* Layer 3: Top Light (Ambient Glow) - Tiefe von oben */}
        <div className="fixed top-0 left-0 right-0 h-[500px] z-[-3] bg-gradient-to-b from-blue-900/10 via-zinc-900/0 to-transparent blur-3xl pointer-events-none will-change-transform" style={{ transform: 'translateZ(0)' }} />
        
        {/* Layer 2: The Fading Grid - Mit Vignette-Maske */}
        <div 
          className="fixed inset-0 z-[-2] h-full w-full pointer-events-none will-change-transform"
          style={{
            transform: 'translateZ(0)',
            backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.075) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.075) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
          } as React.CSSProperties}
        />
        
        {/* Layer 1: Noise (Körnung) - Performante Textur mit Hardware-Beschleunigung */}
        <div 
          className="fixed inset-0 z-[-1] opacity-10 pointer-events-none mix-blend-overlay will-change-transform"
          style={{
            transform: 'translateZ(0)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' fill='%23ffffff' opacity='0.05'/%3E%3Ccircle cx='20' cy='20' r='0.5' fill='%23ffffff' opacity='0.3'/%3E%3Ccircle cx='80' cy='40' r='0.3' fill='%23ffffff' opacity='0.2'/%3E%3Ccircle cx='40' cy='80' r='0.4' fill='%23ffffff' opacity='0.25'/%3E%3Ccircle cx='90' cy='90' r='0.2' fill='%23ffffff' opacity='0.15'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
            imageRendering: 'pixelated',
          } as React.CSSProperties}
        />
        
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}