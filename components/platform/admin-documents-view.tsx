'use client';

import { FileText, User, Calendar, HardDrive } from 'lucide-react';

type Document = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  expiresAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  chat: {
    id: string;
    title: string;
  };
};

type AdminDocumentsViewProps = {
  documents: Document[];
};

export function AdminDocumentsView({ documents }: AdminDocumentsViewProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-white/5 text-zinc-400 border-b border-white/10">
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Datei</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">User</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Chat</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Größe</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Typ</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Erstellt</th>
            <th className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-wider">Läuft ab</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 sm:px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white truncate max-w-xs">
                    {doc.fileName}
                  </span>
                </div>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <p className="text-sm text-zinc-300 truncate max-w-xs">
                  {doc.user.name || doc.user.email || 'Unbekannt'}
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <p className="text-sm text-zinc-400 truncate max-w-xs">
                  {doc.chat.title}
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <span className="text-sm text-zinc-400">{formatFileSize(doc.fileSize)}</span>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <span className="text-xs text-zinc-500 font-mono">{doc.mimeType}</span>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <span className="text-sm text-zinc-400">{formatDate(doc.createdAt)}</span>
              </td>
              <td className="px-4 sm:px-6 py-4">
                <span className={`text-sm ${isExpired(doc.expiresAt) ? 'text-red-400' : 'text-zinc-400'}`}>
                  {formatDate(doc.expiresAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {documents.length === 0 && (
        <div className="p-8 text-center text-zinc-500">
          <p>Noch keine Dokumente vorhanden.</p>
        </div>
      )}
    </div>
  );
}
