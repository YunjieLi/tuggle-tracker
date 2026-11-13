import { localDateValue } from './dates.js';

function localTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

export function sleepMinutesBetween(date, start, end) {
  if (!date || !start || !end) return '';
  const startAt = localTime(date, start);
  const endAt = localTime(date, end);
  if (end < start) endAt.setDate(endAt.getDate() + 1);
  const minutes = Math.round((endAt - startAt) / 60000);
  return Number.isSafeInteger(minutes) && minutes >= 0 ? String(minutes) : '';
}

export function sleepEndFromDuration(date, start, duration) {
  if (!date || !start || duration === '') return null;
  const end = new Date(localTime(date, start).getTime() + Number(duration) * 60000);
  if (!Number.isFinite(end.getTime())) return null;
  return { time: end.toTimeString().slice(0, 5), date: localDateValue(end) };
}
