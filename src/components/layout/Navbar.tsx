'use client';

import { useRef, useState } from 'react';
import { useCardStore } from '@/store/useCardStore';
import { exportCards } from '@/utils/export';

export default function Navbar() {
  const searchQuery = useCardStore((s) => s.searchQuery);
  const setSearchQuery = useCardStore((s) => s.setSearchQuery);
  const cards = useCardStore((s) => s.cards);
  const importCards = useCardStore((s) => s.importCards);

  const [showMenu, setShowMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportCards(cards);
    setShowMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        alert('导入失败：文件不是有效的 JSON');
        return;
      }

      if (!data.cards || !Array.isArray(data.cards)) {
        alert('导入失败：文件格式不正确');
        return;
      }

      // 将 base64 图片上传到服务器，转为本地路径
      for (const card of data.cards as Record<string, unknown>[]) {
        if (card.type === 'finance' && Array.isArray(card.images)) {
          card.images = await Promise.all(
            (card.images as string[]).map(async (img) => {
              if (!img.startsWith('data:')) return img;
              try {
                const blob = await fetch(img).then((r) => r.blob());
                const fd = new FormData();
                fd.append('file', blob, 'import.jpg');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) return img;
                const { url } = await res.json();
                return url;
              } catch {
                return img;
              }
            }),
          );
        }
      }

      const success = importCards(JSON.stringify(data));
      if (!success) {
        alert('导入失败：数据格式不正确');
      }
    } catch {
      alert('导入失败，请重试');
    } finally {
      setImporting(false);
      e.target.value = '';
      setShowMenu(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg" />
          <span className="font-semibold text-gray-900 text-base">TeamCards</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 搜索 */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索卡片..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
          </div>
          {/* 数据菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
              title="数据管理"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20">
                  <button
                    onClick={handleExport}
                    className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition"
                  >
                    导出数据
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition border-t border-gray-100 disabled:opacity-50"
                  >
                    {importing ? '导入中...' : '导入数据'}
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
