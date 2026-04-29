'use client';

import { useState } from 'react';
import type { TaskCard } from '@/types/card';
import { useCardStore } from '@/store/useCardStore';
import StatusBadge from '@/components/common/StatusBadge';
import ProgressBar from '@/components/common/ProgressBar';
import DetailActions from './DetailActions';

interface TaskDetailProps {
  card: TaskCard;
  isNew?: boolean;
}

const priorityConfig = {
  high: { label: '高', color: 'text-red-500' },
  medium: { label: '中', color: 'text-amber-500' },
  low: { label: '低', color: 'text-gray-400' },
};

const statusOptions: TaskCard['status'][] = ['todo', 'in_progress', 'done'];

export default function TaskDetail({ card, isNew }: TaskDetailProps) {
  const updateCard = useCardStore((s) => s.updateCard);
  const deleteCard = useCardStore((s) => s.deleteCard);
  const selectCard = useCardStore((s) => s.selectCard);
  const toggleSubtask = useCardStore((s) => s.toggleSubtask);
  const addSubtask = useCardStore((s) => s.addSubtask);
  const deleteSubtask = useCardStore((s) => s.deleteSubtask);
  const clearIsNew = useCardStore((s) => s.clearIsNew);
  const duplicateCard = useCardStore((s) => s.duplicateCard);

  const [editing, setEditing] = useState(!!isNew);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assignee, setAssignee] = useState(card.assignee);
  const [dueDate, setDueDate] = useState(card.dueDate);
  const [priority, setPriority] = useState(card.priority);
  const [notes, setNotes] = useState(card.notes);
  const [newSubtask, setNewSubtask] = useState('');

  const handleSave = () => {
    updateCard(card.id, {
      title,
      description,
      assignee,
      dueDate,
      priority,
      notes,
    } as Partial<TaskCard>);
    setEditing(false);
    clearIsNew();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    addSubtask(card.id, newSubtask.trim());
    setNewSubtask('');
  };

  const completedCount = card.subtasks.filter((st) => st.completed).length;

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={card.status} cardType="task" />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">任务</span>
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
      </div>

      {/* 进度 */}
      {card.subtasks.length > 0 && (
        <div className="mb-5">
          <ProgressBar progress={card.progress} size="md" />
        </div>
      )}

      {/* 状态切换 */}
      <div className="mb-5">
        <label className="text-xs text-gray-400 block mb-2">状态</label>
        <div className="flex gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => updateCard(card.id, { status: s } as Partial<TaskCard>)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                card.status === s
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {s === 'todo' ? '待办' : s === 'in_progress' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>
      </div>

      {/* 信息网格 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">负责人</div>
          {editing ? (
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="text-sm w-full bg-transparent focus:outline-none"
            />
          ) : (
            <div className="text-sm text-gray-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-600 font-medium">
                {card.assignee[0] || '?'}
              </span>
              {card.assignee || '未指定'}
            </div>
          )}
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">截止日期</div>
          {editing ? (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm w-full bg-transparent focus:outline-none"
            />
          ) : (
            <span className="text-sm text-gray-900">
              {card.dueDate ? new Date(card.dueDate).toLocaleDateString('zh-CN') : '未设置'}
            </span>
          )}
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">优先级</div>
          {editing ? (
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskCard['priority'])}
              className="text-sm w-full bg-transparent focus:outline-none"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          ) : (
            <span className={`text-sm ${priorityConfig[card.priority].color}`}>
              {priorityConfig[card.priority].label}
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

      {/* 子任务 */}
      <div className="bg-gray-50 p-3 rounded-lg mb-5">
        <div className="text-xs text-gray-400 mb-2">
          子任务 ({completedCount}/{card.subtasks.length})
        </div>
        <div className="space-y-1.5 mb-2">
          {card.subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleSubtask(card.id, st.id)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  st.completed
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {st.completed && <span className="text-[10px]">✓</span>}
              </button>
              <span className={`text-sm flex-1 ${st.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {st.title}
              </span>
              <button
                onClick={() => deleteSubtask(card.id, st.id)}
                className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
            placeholder="添加子任务..."
            className="text-sm flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleAddSubtask}
            className="text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            添加
          </button>
        </div>
      </div>

      {/* 备注 */}
      <div className="bg-gray-50 p-3 rounded-lg mb-5">
        <div className="text-xs text-gray-400 mb-1">备注</div>
        {editing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-sm w-full bg-transparent focus:outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">{card.notes || '暂无备注'}</p>
        )}
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
