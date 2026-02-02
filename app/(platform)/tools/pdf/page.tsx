'use client';

import { useState, useCallback } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { PageTransition } from '@/components/ui/PageTransition';
import { FileImage, Plus, Trash2, ChevronUp, ChevronDown, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';

type ImageItem = { id: string; file: File; dataUrl: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    r.readAsDataURL(file);
  });
}

export default function PdfCreatorPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const toAdd: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await fileToDataUrl(file);
        toAdd.push({ id: `${Date.now()}-${i}`, file, dataUrl });
      } catch {
        setError('Eine oder mehrere Dateien konnten nicht geladen werden.');
      }
    }
    setImages((prev) => [...prev, ...toAdd]);
  }, []);

  const remove = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const move = useCallback((id: string, dir: 'up' | 'down') => {
    setImages((prev) => {
      const i = prev.findIndex((img) => img.id === id);
      if (i < 0) return prev;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const buildPdf = useCallback(async () => {
    if (images.length === 0) {
      setError('Bitte zuerst Bilder hinzufügen.');
      return;
    }
    setError(null);
    setBuilding(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - 2 * margin;
      const maxH = pageH - 2 * margin;
      const pxToMm = 25.4 / 72;

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage();
        const img = images[i];
        const format = img.file.type === 'image/png' ? 'PNG' : 'JPEG';
        const dims = doc.getImageProperties(img.dataUrl);
        let w = dims.width;
        let h = dims.height;
        if (w > 500 || h > 500) {
          w *= pxToMm;
          h *= pxToMm;
        }
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          w *= r;
          h *= r;
        }
        const x = margin + (maxW - w) / 2;
        const y = margin + (maxH - h) / 2;
        doc.addImage(img.dataUrl, format, x, y, w, h);
      }

      doc.save(`Sinispace-PDF-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF konnte nicht erstellt werden.');
    } finally {
      setBuilding(false);
    }
  }, [images]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <BackButton />
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <FileImage className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">PDF Creator</h1>
              <p className="text-xs text-gray-500">Bilder zu PDF</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6">
          <p className="mb-6 text-sm text-gray-600">
            Bilder hochladen (JPEG, PNG, WebP). Reihenfolge bestimmt die PDF-Seiten. Ein Klick erstellt dein PDF.
          </p>

          <label className="mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 transition-colors hover:border-red-200 hover:bg-red-50/30">
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <Plus className="mb-2 h-10 w-10 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Bilder auswählen oder hier ablegen</span>
            <span className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP</span>
          </label>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {images.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {images.length} {images.length === 1 ? 'Bild' : 'Bilder'} – Reihenfolge = PDF-Seiten
                </span>
              </div>
              <ul className="space-y-3">
                {images.map((img, index) => (
                  <li
                    key={img.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <img
                      src={img.dataUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1 text-sm text-gray-700 truncate">
                      {img.file.name}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(img.id, 'up')}
                        disabled={index === 0}
                        className={cn(
                          'rounded-lg p-1.5 transition-colors',
                          index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                        )}
                        aria-label="Nach oben"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(img.id, 'down')}
                        disabled={index === images.length - 1}
                        className={cn(
                          'rounded-lg p-1.5 transition-colors',
                          index === images.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                        )}
                        aria-label="Nach unten"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(img.id)}
                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                        aria-label="Entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={buildPdf}
                disabled={building}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-4 font-semibold text-white shadow-lg shadow-red-500/25 transition hover:from-red-600 hover:to-rose-600 disabled:opacity-60"
              >
                {building ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    PDF wird erstellt…
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    PDF erstellen & herunterladen
                  </>
                )}
              </button>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
