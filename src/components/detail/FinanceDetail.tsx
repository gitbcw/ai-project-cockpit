'use client';

import { useState, useRef } from 'react';
import type { FinanceCard } from '@/types/card';
import { useCardStore } from '@/store/useCardStore';
import StatusBadge from '@/components/common/StatusBadge';
import { compressImage } from '@/utils/image';
import DetailActions from './DetailActions';

interface FinanceDetailProps {
  card: FinanceCard;
  isNew?: boolean;
}

const statusOptions: FinanceCard['status'][] = ['pending', 'approved', 'rejected'];

export default function FinanceDetail({ card, isNew }: FinanceDetailProps) {
  const updateCard = useCardStore((s) => s.updateCard);
  const deleteCard = useCardStore((s) => s.deleteCard);
  const selectCard = useCardStore((s) => s.selectCard);
  const clearIsNew = useCardStore((s) => s.clearIsNew);
  const duplicateCard = useCardStore((s) => s.duplicateCard);

  const [editing, setEditing] = useState(!!isNew);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [amount, setAmount] = useState(card.amount);
  const [requester, setRequester] = useState(card.requester);
  const [category, setCategory] = useState(card.category);
  const [expenseDate, setExpenseDate] = useState(card.expenseDate);
  const [images, setImages] = useState(card.images);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateCard(card.id, {
      title,
      description,
      amount,
      requester,
      category,
      expenseDate,
      images,
    } as Partial<FinanceCard>);
    setEditing(false);
    clearIsNew();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const formData = new FormData();
        formData.append('file', blob, file.name);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`上传失败：${err.error || '未知错误'}`);
          return;
        }
        const { url } = await res.json();
        setImages((prev) => {
          const next = [...prev, url];
          if (editing) {
            updateCard(card.id, { images: next } as Partial<FinanceCard>);
          }
          return next;
        });
      }
    } catch {
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (editing) {
        updateCard(card.id, { images: next } as Partial<FinanceCard>);
      }
      return next;
    });
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={card.status} cardType="finance" />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">财务</span>
        </div>
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold text-gray-900 w-full border-b border-gray-200 pb-1 focus:outline-none focus:border-indigo-400"
          />
        ) : (
          <h2 className="text-lg font-bold text-gray-900">{card.title}</h2>
        )}
        <p className="text-2xl font-extrabold text-red-500 mt-2">
          ¥ {card.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* 状态切换 */}
      <div className="mb-5">
        <label className="text-xs text-gray-400 block mb-2">审批状态</label>
        <div className="flex gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => updateCard(card.id, { status: s } as Partial<FinanceCard>)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                card.status === s
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {s === 'pending' ? '待审批' : s === 'approved' ? '已审批' : '已拒绝'}
            </button>
          ))}
        </div>
      </div>

      {/* 信息网格 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">报销人</div>
          {editing ? (
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              className="text-sm w-full bg-transparent focus:outline-none"
            />
          ) : (
            <span className="text-sm text-gray-900">{card.requester || '未指定'}</span>
          )}
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">费用类型</div>
          {editing ? (
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm w-full bg-transparent focus:outline-none"
            />
          ) : (
            <span className="text-sm text-gray-900">{card.category || '未分类'}</span>
          )}
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">消费日期</div>
          {editing ? (
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="text-sm w-full bg-transparent focus:outline-none"
            />
          ) : (
            <span className="text-sm text-gray-900">
              {card.expenseDate ? new Date(card.expenseDate).toLocaleDateString('zh-CN') : '未设置'}
            </span>
          )}
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">创建时间</div>
          <span className="text-sm text-gray-900">
            {new Date(card.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>

      {/* 金额（编辑模式） */}
      {editing && (
        <div className="bg-gray-50 p-3 rounded-lg mb-5">
          <div className="text-xs text-gray-400 mb-1">金额</div>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="text-sm w-full bg-transparent focus:outline-none font-bold"
          />
        </div>
      )}

      {/* 描述 */}
      <div className="bg-gray-50 p-3 rounded-lg mb-5">
        <div className="text-xs text-gray-400 mb-1">描述</div>
        {editing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-sm w-full bg-transparent focus:outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">{card.description || '暂无描述'}</p>
        )}
      </div>

      {/* 凭证图片 */}
      <div className="bg-gray-50 p-3 rounded-lg mb-5">
        <div className="text-xs text-gray-400 mb-2">凭证 ({images.length}张)</div>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`凭证 ${i + 1}`}
                className="w-20 h-16 object-cover rounded-lg border border-gray-200"
              />
              {editing && (
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-20 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-lg text-gray-300 hover:border-gray-400 transition disabled:opacity-50"
            >
              {uploading ? '...' : '+'}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* 操作按钮 */}
      <DetailActions
        isNew={isNew}
        editing={editing}
        onEdit={() => setEditing(true)}
        onSave={handleSave}
        onDelete={() => { deleteCard(card.id); selectCard(null); }}
        onDuplicate={() => { duplicateCard(card.id); selectCard(null); }}
      />
    </div>
  );
}
