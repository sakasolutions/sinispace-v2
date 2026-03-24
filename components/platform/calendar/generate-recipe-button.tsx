'use client';

import { useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { generateRecipeFromCalendar } from '@/actions/week-planner-ai';
import { cn } from '@/lib/utils';

export type GenerateRecipeButtonProps = {
  calendarEventId: string;
  title: string;
  /** Nach erfolgreicher Generierung z. B. `getCalendarEvents` + `setEvents` (Client-State). */
  onSuccess?: () => void | Promise<void>;
  className?: string;
};

export function GenerateRecipeButton({
  calendarEventId,
  title,
  onSuccess,
  className,
}: GenerateRecipeButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await generateRecipeFromCalendar(calendarEventId, title);
        if (res.success) {
          await onSuccess?.();
        } else {
          alert(res.error);
        }
      } catch (e) {
        console.error('[GenerateRecipeButton]', e);
        alert('Rezept konnte nicht erstellt werden.');
      }
    });
  };

  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      onClick={(e) => {
        e.stopPropagation();
        handleGenerate();
      }}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold shadow-sm ring-1 ring-orange-200/60',
        'hover:bg-orange-100 hover:scale-105 active:scale-95 transition-all',
        'disabled:pointer-events-none disabled:hover:scale-100',
        isPending && 'animate-pulse opacity-[0.92]',
        className
      )}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>Rezept wird geschrieben…</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span>Rezept generieren ✨</span>
        </>
      )}
    </button>
  );
}
