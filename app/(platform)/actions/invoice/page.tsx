'use client';

import { useState, useCallback } from 'react';
import { polishInvoiceText, generateInvoiceTexts } from '@/actions/ai-actions';
import { Sparkles, Plus, Download, Wand2, Loader2 } from 'lucide-react';
import { Page, Text, View, StyleSheet, Document, pdf, BlobProvider } from '@react-pdf/renderer';

// Types
type InvoiceItem = {
  id: string;
  quantity: number;
  unit: string;
  description: string;
  priceOne: number;
};

type InvoiceData = {
  type: 'invoice' | 'offer';
  clientName: string;
  clientAddress: string;
  date: Date;
  invoiceNumber: string;
  introText: string;
  outroText: string;
  items: InvoiceItem[];
  taxRate: number;
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e0e0e0',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  totals: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
});

// PDF Document Component
const InvoicePDF = ({ data }: { data: InvoiceData }) => {
  const netto = data.items.reduce((sum, item) => sum + item.quantity * item.priceOne, 0);
  const tax = (netto * data.taxRate) / 100;
  const brutto = netto + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {data.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT'}
          </Text>
          <Text>Rechnungsnummer: {data.invoiceNumber}</Text>
          <Text>Datum: {new Date(data.date).toLocaleDateString('de-DE')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ marginBottom: 10 }}>An:</Text>
          <Text>{data.clientName}</Text>
          <Text>{data.clientAddress}</Text>
        </View>

        {data.introText && (
          <View style={styles.section}>
            <Text>{data.introText}</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 0.5 }]}>Menge</Text>
            <Text style={[styles.tableCell, { flex: 0.3 }]}>Einheit</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>Beschreibung</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Einzelpreis</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Gesamt</Text>
          </View>
          {data.items.map((item) => {
            const total = item.quantity * item.priceOne;
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 0.3 }]}>{item.unit}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.description}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.priceOne.toFixed(2)} €</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{total.toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Netto:</Text>
            <Text>{netto.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>MwSt. ({data.taxRate}%):</Text>
            <Text>{tax.toFixed(2)} €</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 10, borderTop: '1pt solid #000', paddingTop: 5 }]}>
            <Text style={styles.totalLabel}>Gesamt:</Text>
            <Text style={styles.totalLabel}>{brutto.toFixed(2)} €</Text>
          </View>
        </View>

        {data.outroText && (
          <View style={[styles.section, { marginTop: 30 }]}>
            <Text>{data.outroText}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default function InvoicePage() {
  const [data, setData] = useState<InvoiceData>({
    type: 'offer',
    clientName: '',
    clientAddress: '',
    date: new Date(),
    invoiceNumber: '',
    introText: '',
    outroText: '',
    items: [{ id: '1', quantity: 1, unit: 'Stk', description: '', priceOne: 0 }],
    taxRate: 19,
  });

  const [polishingItemId, setPolishingItemId] = useState<string | null>(null);
  const [polishingAll, setPolishingAll] = useState(false);

  const addItem = () => {
    setData({
      ...data,
      items: [...data.items, { id: Date.now().toString(), quantity: 1, unit: 'Stk', description: '', priceOne: 0 }],
    });
  };

  const removeItem = (id: string) => {
    setData({
      ...data,
      items: data.items.filter(item => item.id !== id),
    });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setData({
      ...data,
      items: data.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handlePolishItem = async (itemId: string) => {
    const item = data.items.find(i => i.id === itemId);
    if (!item || !item.description.trim()) return;

    setPolishingItemId(itemId);
    try {
      const polished = await polishInvoiceText(item.description, data.type);
      updateItem(itemId, 'description', polished);
    } catch (error) {
      console.error('Fehler beim Veredeln:', error);
    } finally {
      setPolishingItemId(null);
    }
  };

  const handlePolishAll = async () => {
    setPolishingAll(true);
    try {
      const { intro, outro } = await generateInvoiceTexts(data.clientName, data.type, data.items);
      setData({ ...data, introText: intro, outroText: outro });
    } catch (error) {
      console.error('Fehler beim Generieren:', error);
    } finally {
      setPolishingAll(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = <InvoicePDF data={data} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.type === 'invoice' ? 'Rechnung' : 'Angebot'}_${data.invoiceNumber || 'DRAFT'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Erstellen des PDFs');
    }
  };

  // Berechnungen
  const netto = data.items.reduce((sum, item) => sum + item.quantity * item.priceOne, 0);
  const tax = (netto * data.taxRate) / 100;
  const brutto = netto + tax;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {data.type === 'invoice' ? 'Rechnung' : 'Angebot'} Generator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Editor */}
          <div className="space-y-4">
            {/* Kopfdaten Card */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Kopfdaten</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Typ</label>
                  <select
                    value={data.type}
                    onChange={(e) => setData({ ...data, type: e.target.value as 'invoice' | 'offer' })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="offer">Angebot</option>
                    <option value="invoice">Rechnung</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Kundenname</label>
                  <input
                    type="text"
                    value={data.clientName}
                    onChange={(e) => setData({ ...data, clientName: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="Firma GmbH"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Kundenadresse</label>
                  <textarea
                    value={data.clientAddress}
                    onChange={(e) => setData({ ...data, clientAddress: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white min-h-[80px]"
                    placeholder="Musterstraße 1&#10;12345 Musterstadt"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Datum</label>
                    <input
                      type="date"
                      value={data.date.toISOString().split('T')[0]}
                      onChange={(e) => setData({ ...data, date: new Date(e.target.value) })}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Rechnungsnummer</label>
                    <input
                      type="text"
                      value={data.invoiceNumber}
                      onChange={(e) => setData({ ...data, invoiceNumber: e.target.value })}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="RE-2024-001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">MwSt. Satz (%)</label>
                  <input
                    type="number"
                    value={data.taxRate}
                    onChange={(e) => setData({ ...data, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Positionen */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Positionen</h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Position hinzufügen
                </button>
              </div>

              <div className="space-y-3">
                {data.items.map((item) => (
                  <div key={item.id} className="bg-zinc-800/50 border border-white/5 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="col-span-2 bg-zinc-700 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                        placeholder="1"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="col-span-2 bg-zinc-700 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                        placeholder="Stk"
                      />
                      <div className="col-span-6 flex gap-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="flex-1 bg-zinc-700 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                          placeholder="Wand streichen"
                        />
                        <button
                          onClick={() => handlePolishItem(item.id)}
                          disabled={polishingItemId === item.id || !item.description.trim()}
                          className="px-2 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          title="Mit KI veredeln"
                        >
                          {polishingItemId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={item.priceOne}
                        onChange={(e) => updateItem(item.id, 'priceOne', parseFloat(e.target.value) || 0)}
                        className="col-span-2 bg-zinc-700 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                        placeholder="0.00"
                      />
                    </div>
                    {data.items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Zusammenfassung</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Netto:</span>
                  <span className="text-white font-medium">{netto.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">MwSt. ({data.taxRate}%):</span>
                  <span className="text-white font-medium">{tax.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white font-semibold">Gesamt:</span>
                  <span className="text-white font-bold text-lg">{brutto.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* AI Actions */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">KI-Veredelung</h2>
              <button
                onClick={handlePolishAll}
                disabled={polishingAll || !data.clientName || data.items.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {polishingAll ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generiere Texte...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Ganzes Dokument polieren
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-400 mt-2">
                Generiert professionelle Einleitungs- und Schlusstexte basierend auf Kunde und Positionen.
              </p>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:sticky lg:top-4 h-fit">
            <div className="bg-white rounded-lg shadow-2xl p-8 min-h-[800px]">
              <div className="text-black">
                <h1 className="text-2xl font-bold mb-6">
                  {data.type === 'invoice' ? 'RECHNUNG' : 'ANGEBOT'}
                </h1>
                
                <div className="mb-6 text-sm">
                  <p className="font-semibold">Rechnungsnummer: {data.invoiceNumber || 'RE-2024-001'}</p>
                  <p>Datum: {new Date(data.date).toLocaleDateString('de-DE')}</p>
                </div>

                {data.clientName && (
                  <div className="mb-6">
                    <p className="font-semibold mb-1">An:</p>
                    <p>{data.clientName}</p>
                    {data.clientAddress && (
                      <p className="whitespace-pre-line">{data.clientAddress}</p>
                    )}
                  </div>
                )}

                {data.introText && (
                  <div className="mb-6 text-sm">
                    <p>{data.introText}</p>
                  </div>
                )}

                <table className="w-full border-collapse mb-6 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">Menge</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Einheit</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Beschreibung</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Einzelpreis</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => {
                      const total = item.quantity * item.priceOne;
                      return (
                        <tr key={item.id}>
                          <td className="border border-gray-300 px-3 py-2">{item.quantity}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.unit}</td>
                          <td className="border border-gray-300 px-3 py-2">{item.description || '-'}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">{item.priceOne.toFixed(2)} €</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">{total.toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="ml-auto w-64 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Netto:</span>
                    <span className="font-medium">{netto.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>MwSt. ({data.taxRate}%):</span>
                    <span className="font-medium">{tax.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-black font-bold">
                    <span>Gesamt:</span>
                    <span>{brutto.toFixed(2)} €</span>
                  </div>
                </div>

                {data.outroText && (
                  <div className="mt-8 text-sm">
                    <p>{data.outroText}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              PDF Herunterladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
