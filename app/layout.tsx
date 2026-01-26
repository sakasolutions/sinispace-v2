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
        {/* Cinematic Background Stack – nur Hintergrund, kein Foreground-Gradient */}
        {/* Top-Light-Gradient entfernt: 500px weisser Schleier über Tool-Inhalten */}
        
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
        
        {/* Noise (Körnung) entfernt – hat als Schleier über dem Content gewirkt */}
        
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}