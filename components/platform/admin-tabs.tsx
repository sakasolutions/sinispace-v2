'use client';

import { useState } from 'react';
import { Users, MessageSquare, FileText, BarChart3, Eye, TrendingUp } from 'lucide-react';
import { AdminUserTable } from './admin-user-table';
import { AdminChatsView } from './admin-chats-view';
import { AdminDocumentsView } from './admin-documents-view';
import { AdminStatsView } from './admin-stats-view';
import { AnalyticsDashboard } from './analytics-dashboard';

type Tab = 'users' | 'chats' | 'documents' | 'stats' | 'analytics';

type AdminTabsProps = {
  users: any[];
  chats: any[];
  documents: any[];
  stats: any;
};

export function AdminTabs({ users, chats, documents, stats }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const tabs = [
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'chats' as Tab, label: 'Chats', icon: MessageSquare },
    { id: 'documents' as Tab, label: 'Dokumente', icon: FileText },
    { id: 'stats' as Tab, label: 'Statistiken', icon: BarChart3 },
    { id: 'analytics' as Tab, label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div>
      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-2 text-sm font-medium ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === 'users' && <AdminUserTable users={users} />}
        {activeTab === 'chats' && <AdminChatsView chats={chats} />}
        {activeTab === 'documents' && <AdminDocumentsView documents={documents} />}
        {activeTab === 'stats' && <AdminStatsView stats={stats} />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
}
