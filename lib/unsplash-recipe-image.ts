/**
 * Unsplash-Suche für Rezeptbilder: Query verstärken (Food-Fotografie-Keywords).
 * Englische Formulierung kommt idealerweise aus dem KI-Feld imageSearchQuery.
 */
const QUALITY_HINTS = ['food photography', 'plating'];

export function enhanceUnsplashSearchQuery(raw: string): string {
  const base = raw.replace(/\s+/g, ' ').trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  const hasHint = QUALITY_HINTS.some((h) => lower.includes(h));
  if (hasHint) return base;
  return `${base} ${QUALITY_HINTS.join(' ')}`.replace(/\s+/g, ' ').trim();
}

export async function fetchUnsplashImageForRecipe(
  query: string
): Promise<{ imageUrl: string | null; imageCredit: string | null }> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const q = enhanceUnsplashSearchQuery(query);
  if (!unsplashKey || !q) {
    return { imageUrl: null, imageCredit: null };
  }
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape&client_id=${unsplashKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { imageUrl: null, imageCredit: null };
    const data = (await res.json()) as {
      results?: Array<{ urls?: { regular?: string }; user?: { name?: string } }>;
    };
    const first = data?.results?.[0];
    if (first?.urls?.regular) {
      return { imageUrl: first.urls.regular, imageCredit: first.user?.name ?? null };
    }
  } catch (e) {
    console.error('[Unsplash] fetch error:', e);
  }
  return { imageUrl: null, imageCredit: null };
}
