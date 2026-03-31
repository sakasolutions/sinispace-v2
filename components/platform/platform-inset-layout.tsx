import { cn } from '@/lib/utils';

/** Gleiches Card-Design wie Settings (Inset-Grouped). */
export const PLATFORM_INSET_CARD_CLASS =
  'w-full bg-[#1A1A1D] border border-white/10 rounded-2xl overflow-hidden';

type PlatformInsetLayoutProps = {
  children: React.ReactNode;
  /** `settings`: max-w-3xl · `admin`: max-w-5xl (breitere Tabellen) */
  variant?: 'settings' | 'admin';
  className?: string;
};

/**
 * Opt-out vom Parent-Scroll-`px-0` in platform-layout-content (`data-no-padding`)
 * und einheitliches horizontales Inset für Einstellungs-ähnliche Seiten.
 */
export function PlatformInsetLayout({
  children,
  variant = 'settings',
  className,
}: PlatformInsetLayoutProps) {
  return (
    <div
      data-no-padding
      className={cn(
        'w-full mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6',
        variant === 'admin' ? 'max-w-5xl' : 'max-w-3xl',
        className
      )}
    >
      {children}
    </div>
  );
}
