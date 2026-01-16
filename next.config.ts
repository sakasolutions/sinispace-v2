import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance Optimierungen
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Komprimierung
  compress: true,
  // Experimentelle Features für bessere Performance
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
    // Body-Size-Limit für Server Actions erhöhen (für Datei-Uploads)
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
