import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sinispace',
  description: 'Deine Alltags-KI. Minimalistisch und effizient.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sinispace',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F0914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`h-full text-white ${inter.variable}`}
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
        className={`flex min-h-[100dvh] flex-col font-sans antialiased tracking-tight text-white ${inter.className}`}
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
          } as React.CSSProperties
        }
      >
        <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
