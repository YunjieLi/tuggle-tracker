export function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatAppDate(value, language = 'en', today = new Date()) {
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : localDateValue(new Date(value));
  const elapsedDays = (Date.parse(localDateValue(today)) - Date.parse(day)) / 86400000;
  if (elapsedDays === 0) return language === 'zh' ? '今天' : 'Today';
  if (elapsedDays === 1) return language === 'zh' ? '昨天' : 'Yesterday';
  return elapsedDays > 1 && elapsedDays < 7 ? `${elapsedDays}d` : day.slice(5);
}

export function formatRecordTime(value, language, now = new Date()) {
  const dateLabel = formatAppDate(value, language, now);
  if (localDateValue(new Date(value)) !== localDateValue(now)) return dateLabel;
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return language === 'zh' ? '刚刚' : 'Just now';
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
}
