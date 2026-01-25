'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CopyButton } from '@/components/ui/copy-button';
import { Mail, FileText, Scale, Table2, ChefHat, Dumbbell, Plane, Sparkles, Languages, MessageCircleHeart, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { useRouter } from 'next/navigation';

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Result = {
  id: string;
  toolId: string;
  toolName: string;
  title: string | null;
  content: string;
  metadata: string | null;
  createdAt: Date;
};

const toolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  invoice: FileText,
  legal: Scale,
  excel: Table2,
  recipe: ChefHat,
  fitness: Dumbbell,
  travel: Plane,
  polish: Sparkles,
  translate: Languages,
  'tough-msg': MessageCircleHeart,
  'job-desc': FileText,
  summarize: FileText,
};

interface ResultDetailClientProps {
  workspace: Workspace;
  result: Result;
}

export function ResultDetailClient({ workspace, result }: ResultDetailClientProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const ToolIcon = toolIconMap[result.toolId] || FileText;

  // Parse Content je nach Tool-Typ
  let displayContent: any = null;
  let isJSON = false;

  try {
    const parsed = JSON.parse(result.content);
    if (typeof parsed === 'object' && parsed !== null) {
      displayContent = parsed;
      isJSON = true;
    }
  } catch {
    // Nicht JSON, als Text behandeln
    displayContent = result.content;
    isJSON = false;
  }

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Content je nach Tool-Typ
  const renderContent = () => {
    if (!isJSON) {
      // Text-Content (Email, Summarize, Translate, etc.)
      return (
        <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
          <MarkdownRenderer content={result.content} />
        </div>
      );
    }

    // JSON-Content (Recipe, Travel, Fitness)
    if (result.toolId === 'recipe') {
      const recipe = displayContent as any;
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{recipe.recipeName || 'Rezept'}</h2>
            {recipe.stats && (
              <div className="flex flex-wrap gap-3 mb-4">
                {recipe.stats.time && (
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm">
                    ⏱️ {recipe.stats.time}
                  </span>
                )}
                {recipe.stats.calories && (
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm">
                    🔥 {recipe.stats.calories}
                  </span>
                )}
                {recipe.stats.difficulty && (
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm">
                    {recipe.stats.difficulty}
                  </span>
                )}
              </div>
            )}
          </div>

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Zutaten</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing: string, i: number) => (
                  <li key={i} className="text-zinc-300 flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.instructions && recipe.instructions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Zubereitung</h3>
              <ol className="space-y-3">
                {recipe.instructions.map((step: string, i: number) => (
                  <li key={i} className="text-zinc-300 flex gap-3">
                    <span className="text-orange-400 font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {recipe.chefTip && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm font-semibold text-orange-300 mb-1">💡 Profi-Tipp</p>
              <p className="text-sm text-zinc-300">{recipe.chefTip}</p>
            </div>
          )}
        </div>
      );
    }

    if (result.toolId === 'travel') {
      const plan = displayContent as any;
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{plan.tripTitle || 'Reiseplan'}</h2>
            {plan.vibeDescription && (
              <p className="text-zinc-300">{plan.vibeDescription}</p>
            )}
          </div>

          {plan.itinerary && plan.itinerary.length > 0 && (
            <div className="space-y-4">
              {plan.itinerary.map((day: any, dayIndex: number) => (
                <div key={dayIndex} className="border border-white/10 rounded-xl p-4 bg-zinc-900/50">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Tag {day.day}: {day.title}
                  </h3>
                  <div className="space-y-3">
                    {day.morning?.place && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">🌅 Morgen</p>
                        <p className="text-zinc-300 font-medium">{day.morning.place}</p>
                        {day.morning.desc && (
                          <p className="text-sm text-zinc-400 mt-1">{day.morning.desc}</p>
                        )}
                        {day.morning.mapQuery && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.morning.mapQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                          >
                            📍 Auf Maps öffnen
                          </a>
                        )}
                      </div>
                    )}
                    {day.afternoon?.place && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">☀️ Nachmittag</p>
                        <p className="text-zinc-300 font-medium">{day.afternoon.place}</p>
                        {day.afternoon.desc && (
                          <p className="text-sm text-zinc-400 mt-1">{day.afternoon.desc}</p>
                        )}
                        {day.afternoon.mapQuery && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.afternoon.mapQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                          >
                            📍 Auf Maps öffnen
                          </a>
                        )}
                      </div>
                    )}
                    {day.evening?.place && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">🌙 Abend</p>
                        <p className="text-zinc-300 font-medium">{day.evening.place}</p>
                        {day.evening.desc && (
                          <p className="text-sm text-zinc-400 mt-1">{day.evening.desc}</p>
                        )}
                        {day.evening.mapQuery && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.evening.mapQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                          >
                            📍 Auf Maps öffnen
                          </a>
                        )}
                      </div>
                    )}
                    {day.googleMapsRouteUrl && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <a
                          href={day.googleMapsRouteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                        >
                          🗺️ Ganze Tages-Route auf Maps öffnen
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (result.toolId === 'fitness') {
      const plan = displayContent as any;
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{plan.title || 'Trainingsplan'}</h2>
            {plan.summary && (
              <p className="text-zinc-300">{plan.summary}</p>
            )}
          </div>

          {plan.warmup && plan.warmup.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Warm-up</h3>
              <ul className="space-y-2">
                {plan.warmup.map((w: string, i: number) => (
                  <li key={i} className="text-zinc-300 flex items-start gap-2">
                    <span className="text-rose-400 mt-1">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.exercises && plan.exercises.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Hauptteil</h3>
              <ul className="space-y-4">
                {plan.exercises.map((ex: any, i: number) => (
                  <li key={i} className="border border-white/10 rounded-lg p-4 bg-zinc-900/50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{ex.name}</h4>
                      <span className="text-rose-400 text-sm font-medium">{ex.setsReps}</span>
                    </div>
                    {ex.visualCue && (
                      <p className="text-sm text-zinc-400 mb-2">{ex.visualCue}</p>
                    )}
                    {ex.youtubeQuery && (
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        🎥 Technik-Video suchen
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.cooldown && plan.cooldown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Cool-down</h3>
              <ul className="space-y-2">
                {plan.cooldown.map((c: string, i: number) => (
                  <li key={i} className="text-zinc-300 flex items-start gap-2">
                    <span className="text-rose-400 mt-1">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Fallback für andere JSON-Formate
    return (
      <div className="prose prose-sm max-w-none text-white prose-invert">
        <pre className="bg-zinc-900/50 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(displayContent, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumb 
        items={[
          { label: workspace.name, href: `/workspace/${workspace.id}` },
          { label: result.title || result.toolName }
        ]} 
      />

      <div className="mb-6">
        <Link
          href={`/workspace/${workspace.id}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Workspace
        </Link>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
            <ToolIcon className="w-6 h-6 text-zinc-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {result.title || result.toolName}
            </h1>
            <p className="text-sm text-zinc-400">
              {result.toolName} • {formatDate(result.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
            Ergebnis
          </span>
          <div className="flex items-center gap-2">
            <CopyButton 
              text={isJSON ? JSON.stringify(displayContent, null, 2) : result.content} 
              size="sm" 
            />
            {/* Weiter bearbeiten Button für Smart Chain Workflows */}
            <Link
              href={`/chat?resultId=${result.id}`}
              className="px-3 py-1.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-medium transition-colors"
            >
              Weiter bearbeiten
            </Link>
          </div>
        </div>

        <div className="min-h-[200px]">
          {!isExpanded ? (
            <div>
              <div className="line-clamp-3 text-white text-sm">
                {isJSON ? (
                  <pre className="whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(displayContent, null, 2).split('\n').slice(0, 3).join('\n')}
                    {JSON.stringify(displayContent, null, 2).split('\n').length > 3 && '...'}
                  </pre>
                ) : (
                  <div className="prose prose-sm max-w-none text-white prose-invert">
                    <MarkdownRenderer content={result.content.split('\n').slice(0, 3).join('\n') + (result.content.split('\n').length > 3 ? '\n...' : '')} />
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                Vollständig anzeigen <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div>
              {renderContent()}
              <button
                onClick={() => setIsExpanded(false)}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Weniger anzeigen ↑
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
