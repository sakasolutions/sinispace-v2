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
    { media: '(prefers-color-scheme: light)', color: '#fafafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className="h-full bg-canvas"
      style={
        {
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
        } as React.CSSProperties
      }
    >
      <body
        className="min-h-[100dvh] bg-canvas font-sans antialiased tracking-tight text-slate-900"
        style={
          {
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'none',
            overscrollBehaviorX: 'none',
            scrollBehavior: 'smooth',
            margin: 0,
            padding: 0,
            height: '100%',
            paddingTop: 0,
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          } as React.CSSProperties
        }
      >
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
