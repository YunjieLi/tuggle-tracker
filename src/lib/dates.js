export function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatAppDate(value, today = new Date()) {
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : localDateValue(new Date(value));
  const elapsedDays = (Date.parse(localDateValue(today)) - Date.parse(day)) / 86400000;
  return elapsedDays >= 0 && elapsedDays < 7 ? `${elapsedDays}d` : day.slice(5);
}
