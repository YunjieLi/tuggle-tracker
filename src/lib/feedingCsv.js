import { localDateValue } from './dates.js';

const headers = ['日期,时间,母乳,水奶', 'date,time,breastmilk,formula'];

function closestYear(month, day, today) {
  const currentYear = today.getFullYear();
  const reference = Date.UTC(currentYear, today.getMonth(), today.getDate());
  let closest;
  let distance = Infinity;
  // Search far enough to find a nearby leap year for February 29.
  for (let year = currentYear - 4; year <= currentYear + 4; year++) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) continue;
    const gap = Math.abs(candidate.getTime() - reference);
    if (gap < distance) {
      closest = year;
      distance = gap;
    }
  }
  return closest;
}

export function parseFeedingCsv(csv, today = new Date()) {
  const records = [];
  let firstRow = true;
  for (const [index, line] of csv.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const columns = line.split(',').map(value => value.trim().replace(/^"([^"]*)"$/, '$1').trim());
    const isHeader = firstRow && headers.includes(columns.join(',').toLowerCase());
    firstRow = false;
    if (isHeader) continue;

    const [day, time, breastmilk, formula] = columns;
    const dateParts = day.match(/^(\d{1,2})\.(\d{1,2})$/);
    const timeParts = time?.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    const validAmount = value => /^\d+$/.test(value ?? '') && Number.isSafeInteger(Number(value));
    if (columns.length !== 4 || !dateParts || !timeParts || !validAmount(breastmilk) || !validAmount(formula)) {
      return { errorLine: index + 1 };
    }

    const [, month, date] = dateParts.map(Number);
    const [, hour, minute] = timeParts.map(Number);
    const year = closestYear(month, date, today);
    if (year === undefined) return { errorLine: index + 1 };
    const timestamp = new Date(year, month - 1, date, hour, minute);
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    if (localDateValue(timestamp) !== dateKey || timestamp.getHours() !== hour || timestamp.getMinutes() !== minute) {
      return { errorLine: index + 1 };
    }

    records.push({
      kind: 'feed', at: timestamp.toISOString(), detail: 'Feed', note: '', breastfeeding: false,
      breastmilkAmount: Number(breastmilk), formulaAmount: Number(formula),
    });
  }
  return { records };
}
