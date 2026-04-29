interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ progress, size = 'sm' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1' : 'h-1.5';
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`flex-1 ${height} bg-gray-100 rounded-full overflow-hidden`}
      >
        <div
          className={`${height} bg-indigo-500 rounded-full transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-indigo-500 font-semibold min-w-[28px] text-right">{clamped}%</span>
    </div>
  );
}
