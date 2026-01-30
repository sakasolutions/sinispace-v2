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
  weight: ['400', '500', '600', '700', '800'],
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
    <html lang="de" className="h-full" style={{ 
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
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${plusJakartaSans.className} text-gray-900 antialiased tracking-tight relative`} style={{ 
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
        {/* Variante 1+3: Warmverlauf + Ambient Brand Blobs */}
        {/* Layer 1: Sanfter Warmverlauf (cremeweiß oben -> warmgrau unten) */}
        <div 
          className="fixed inset-0 z-[-3] h-full w-full pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #fffbf7 0%, #faf8f5 50%, #f5f3f0 100%)',
          } as React.CSSProperties}
        />
        {/* Layer 2: Ambient Brand Blobs - Orange/Pink Glows in den Ecken */}
        <div className="fixed inset-0 z-[-2] h-full w-full pointer-events-none overflow-hidden">
          {/* Orange Blob - Oben Links */}
          <div 
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.8) 0%, rgba(249, 115, 22, 0) 70%)',
              filter: 'blur(60px)',
            }}
          />
          {/* Pink Blob - Unten Rechts */}
          <div 
            className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full opacity-[0.05]"
            style={{
              background: 'radial-gradient(circle, rgba(244, 114, 182, 0.8) 0%, rgba(244, 114, 182, 0) 70%)',
              filter: 'blur(80px)',
            }}
          />
          {/* Orange/Pink Blob - Mitte Rechts (dezent) */}
          <div 
            className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.04]"
            style={{
              background: 'radial-gradient(circle, rgba(251, 146, 60, 0.7) 0%, rgba(251, 146, 60, 0) 70%)',
              filter: 'blur(50px)',
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