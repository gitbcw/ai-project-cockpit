'use client';

import { useCardStore } from '@/store/useCardStore';
import type { TabType } from '@/types/card';

const tabs: { key: TabType; label: string }[] = [
  { key: 'task', label: '任务' },
  { key: 'finance', label: '财务' },
];

export default function TabBar() {
  const activeTab = useCardStore((s) => s.activeTab);
  const setActiveTab = useCardStore((s) => s.setActiveTab);
  const cards = useCardStore((s) => s.cards);

  const countMap = {
    task: cards.filter((c) => c.type === 'task').length,
    finance: cards.filter((c) => c.type === 'finance').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {countMap[tab.key] > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  activeTab === tab.key
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {countMap[tab.key]}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
