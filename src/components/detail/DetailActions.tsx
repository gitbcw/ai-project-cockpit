'use client';

import { useState } from 'react';

interface DetailActionsProps {
  isNew?: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export default function DetailActions({ isNew, editing, onEdit, onSave, onDelete, onDuplicate }: DetailActionsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
  };

  return (
    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-500">确认删除？</span>
          <button
            onClick={handleDeleteClick}
            className="text-sm px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            删除
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {!isNew && onDuplicate && (
            <button
              onClick={onDuplicate}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              复制
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className="text-sm text-red-400 hover:text-red-600 transition"
          >
            删除
          </button>
        </div>
      )}
      {editing ? (
        <button
          onClick={onSave}
          className="text-sm px-4 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
        >
          保存
        </button>
      ) : (
        <button
          onClick={onEdit}
          className="text-sm px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          编辑
        </button>
      )}
    </div>
  );
}
