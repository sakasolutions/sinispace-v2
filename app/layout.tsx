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
      <body className={`${inter.variable} bg-white ${plusJakartaSans.variable} ${plusJakartaSans.className} text-gray-900 antialiased tracking-tight relative`} style={{ 
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
        paddingTop: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      } as React.CSSProperties}>
        {/* Globaler Hintergrund: oben dezent warm, unten zwingend weiß (to-white killt beigen Balken) */}
        <div 
          className="fixed inset-0 z-[-3] h-full w-full pointer-events-none bg-gradient-to-b from-rose-50 via-white to-white"
          aria-hidden="true"
        />
        
        <div className="relative z-10 pb-32">
          {children}
        </div>
      </body>
    </html>
  );
}