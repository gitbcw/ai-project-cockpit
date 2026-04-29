interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = '暂无卡片，点击上方按钮新建' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="w-16 h-16 mb-4 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-2xl">
        +
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
