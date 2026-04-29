/**
 * 将日期字符串转为可安全比较的 YYYY-MM-DD 格式。
 * 输入可能是 "2025-04-18"、"2025-04-18T08:00:00.000Z" 等。
 * 输出 "2025-04-18"，直接字符串比较即可判断先后。
 */
export function toDateStr(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** 今天日期的 YYYY-MM-DD 表示 */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 判断日期字符串是否已过期（不含今天） */
export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return toDateStr(dateStr) < todayStr();
}
