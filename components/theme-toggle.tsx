'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Verhindere Hydration-Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder während Hydration
    return (
      <button
        className="w-10 h-10 rounded-lg bg-zinc-800/50 dark:bg-zinc-800/50 border border-white/10 flex items-center justify-center transition-colors"
        aria-label="Theme wechseln"
      >
        <Sun className="w-4 h-4 text-zinc-400" />
      </button>
    );
  }

  const currentTheme = theme || 'system';

  return (
    <div className="relative">
      <button
        onClick={() => {
          // Rotiere durch: system -> light -> dark -> system
          if (currentTheme === 'system') {
            setTheme('light');
          } else if (currentTheme === 'light') {
            setTheme('dark');
          } else {
            setTheme('system');
          }
        }}
        className="w-10 h-10 rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-white/10 hover:bg-white dark:hover:bg-zinc-700 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label={`Theme wechseln (aktuell: ${currentTheme})`}
        title={`Theme: ${currentTheme === 'system' ? 'System' : currentTheme === 'light' ? 'Hell' : 'Dunkel'}`}
      >
        {currentTheme === 'light' ? (
          <Sun className="w-4 h-4 text-orange-500" />
        ) : currentTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-blue-400" />
        ) : (
          <Monitor className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        )}
      </button>
    </div>
  );
}
