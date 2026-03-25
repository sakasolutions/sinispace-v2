import './globals.css';
import type { Metadata, Viewport } from 'next';

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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // App-feeling: kein Zoom
  viewportFit: 'cover', // iPhone notches
  height: 'device-height', // Full coverage
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full bg-[#FAFAFC]" style={{ 
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
      <body className="relative font-sans bg-[#FAFAFC] text-gray-900 antialiased tracking-tight" style={{ 
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
        {/* Tier-1 Canvas: einheitliches Off-White – keine weißen Lücken unter kurzem Content */}
        <div
          className="pointer-events-none fixed inset-0 z-[-3] h-full min-h-[100dvh] w-full bg-[#FAFAFC]"
          aria-hidden="true"
        />
        
        <div className="relative z-10 pb-32">
          {children}
        </div>
      </body>
    </html>
  );
}