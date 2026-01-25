'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, MessageSquare, Copy, CheckCircle2 } from 'lucide-react';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
  recipeName: string;
}

export function ShoppingListModal({ isOpen, onClose, ingredients, recipeName }: ShoppingListModalProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(ingredients);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'simple' | 'whatsapp'>('simple');

  if (!isOpen) return null;

  const toggleIngredient = (ingredient: string) => {
    setSelectedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const generateShoppingList = () => {
    if (format === 'whatsapp') {
      return `Hey, könntest du einkaufen? 🛒\n\n${recipeName}\n\n${selectedIngredients.map(i => `- ${i}`).join('\n')}\n\nDanke! ❤️`;
    }
    return selectedIngredients.map(i => `- ${i}`).join('\n');
  };

  const handleCopy = async () => {
    const text = generateShoppingList();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = generateShoppingList();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Einkaufsliste erstellen</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <p className="text-sm text-zinc-400 mb-4">
            Wähle die Zutaten aus, die du einkaufen musst:
          </p>

          {/* Format Selection */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setFormat('simple')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                format === 'simple'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                  : 'bg-zinc-800/50 border border-white/10 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Für mich
            </button>
            <button
              onClick={() => setFormat('whatsapp')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                format === 'whatsapp'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                  : 'bg-zinc-800/50 border border-white/10 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Als WhatsApp
            </button>
          </div>

          {/* Ingredients List */}
          <div className="space-y-2 mb-4">
            {ingredients.map((ingredient, index) => {
              const isSelected = selectedIngredients.includes(ingredient);
              return (
                <button
                  key={index}
                  onClick={() => toggleIngredient(ingredient)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    isSelected
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-zinc-800/50 border border-white/10 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-zinc-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                    {ingredient}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview */}
          {selectedIngredients.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-white/10">
              <p className="text-xs text-zinc-500 mb-2">Vorschau:</p>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans">
                {generateShoppingList()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={handleCopy}
            disabled={selectedIngredients.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Kopieren
              </>
            )}
          </button>
          {format === 'whatsapp' && (
            <button
              onClick={handleWhatsApp}
              disabled={selectedIngredients.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp öffnen
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
