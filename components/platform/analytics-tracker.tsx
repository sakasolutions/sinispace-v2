'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Client-Side Analytics Tracker
 * Trackt automatisch Seitenaufrufe und Feature-Nutzung
 * Session wird server-seitig im API-Route geholt
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Tracke Seitenaufruf (Session wird im API-Route geholt)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'page_view',
        page: pathname,
      }),
    }).catch(err => {
      // Silent fail - Analytics sollten nicht die App stören
      console.error('[ANALYTICS] Tracking-Fehler:', err);
    });
  }, [pathname]);

  return null; // Kein UI
}
