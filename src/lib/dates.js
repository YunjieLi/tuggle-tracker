export function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatAppDate(value, language = 'en', today = new Date(), { showWeekday = false } = {}) {
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : localDateValue(new Date(value));
  const elapsedDays = (Date.parse(localDateValue(today)) - Date.parse(day)) / 86400000;
  if (elapsedDays === 0) return language === 'zh' ? '今天' : 'Today';
  if (elapsedDays === 1) return language === 'zh' ? '昨天' : 'Yesterday';
  const [, month, date] = day.split('-').map(Number);
  if (showWeekday) {
    const weekday = new Date(day).getUTCDay();
    return language === 'zh'
      ? `${month}/${date}（${'日一二三四五六'[weekday]}）`
      : `${month}/${date} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday]})`;
  }
  return `${month}/${date}`;
}

export function formatRecordTime(value, language, now = new Date()) {
  const recordedAt = new Date(value);
  const minutes = Math.floor((now.getTime() - recordedAt.getTime()) / 60000);
  if (minutes >= 0 && minutes < 60) {
    return minutes === 0 ? (language === 'zh' ? '刚刚' : 'Just now') : `${minutes}m`;
  }
  const hours = String(recordedAt.getHours()).padStart(2, '0');
  const minute = String(recordedAt.getMinutes()).padStart(2, '0');
  return `${hours}:${minute}`;
}
