'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, MessageSquare, Copy, CheckCircle2 } from 'lucide-react';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
  recipeName: string;
  showBackToRecipe?: boolean;
  onBackToRecipe?: () => void;
}

export function ShoppingListModal({ isOpen, onClose, ingredients, recipeName, showBackToRecipe, onBackToRecipe }: ShoppingListModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Einkaufsliste erstellen</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-220px)]">
          <p className="text-sm text-gray-600 mb-4">
            Wähle die Zutaten aus, die du einkaufen musst:
          </p>

          <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setFormat('simple')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                format === 'simple'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Für mich
            </button>
            <button
              onClick={() => setFormat('whatsapp')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                format === 'whatsapp'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Als WhatsApp
            </button>
          </div>

          <div className="space-y-0 rounded-xl border border-gray-100 overflow-hidden">
            {ingredients.map((ingredient, index) => {
              const isSelected = selectedIngredients.includes(ingredient);
              return (
                <button
                  key={index}
                  onClick={() => toggleIngredient(ingredient)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    isSelected
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {ingredient}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedIngredients.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2 font-medium">Vorschau</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {generateShoppingList()}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={selectedIngredients.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp öffnen
              </button>
            )}
          </div>
          {showBackToRecipe && onBackToRecipe && (
            <button
              onClick={onBackToRecipe}
              className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Zurück zum Rezept
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
