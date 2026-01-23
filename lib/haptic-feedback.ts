/**
 * Haptic Feedback Utility
 * Bietet Vibration-Feedback für Touch-Gesten (nur auf unterstützten Geräten)
 */

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  // Prüfe ob Vibration API verfügbar ist (nur auf mobilen Geräten)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10], // Kurz-Pause-Kurz (Erfolg)
      error: [20, 50, 20, 50, 20], // Lang-Pause-Lang-Pause-Lang (Fehler)
    };

    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }
}
