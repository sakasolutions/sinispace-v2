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
        {/* Background Texture - CSS-generated Noise (Performance-Optimierung: keine externe URL mehr) */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-20 brightness-100 contrast-150"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
          }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}