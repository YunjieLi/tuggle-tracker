import who from './who-girls-lms.json';
import cdc from './cdc-girls-lms.json';

// WHO girls' expanded z-score tables, indexed by age in days.
// https://www.who.int/tools/child-growth-standards/standards
export const baby = { name: 'Anning', birthDate: '2026-09-11' };

export function ageInDays(date) {
  return date ? (Date.parse(date) - Date.parse(baby.birthDate)) / 86400000 : NaN;
}

export const growthReferences = {
  WHO: { url: 'https://www.who.int/tools/child-growth-standards/standards' },
  CDC: { url: 'https://www.cdc.gov/growthcharts/cdc-data-files.htm' },
};

export function referenceMaxDay(standard, metric) {
  return standard === 'WHO' ? who[metric].length - 1 : Math.floor(cdc[metric].at(-1)[0] * 30.4375);
}

function lmsAt(standard, metric, day) {
  if (!(day >= 0 && day <= referenceMaxDay(standard, metric))) return null;
  if (standard === 'WHO') return who[metric][day];

  // CDC permits interpolation between the published half-month LMS points.
  const month = day / 30.4375;
  const rows = cdc[metric];
  const right = rows.findIndex(([age]) => age >= month);
  if (right === 0) return rows[0].slice(1);
  const [start, ...before] = rows[right - 1];
  const [end, ...after] = rows[right];
  return before.map((value, i) => value + (after[i] - value) * (month - start) / (end - start));
}

function measurementAt([l, m, s], z) {
  return l ? m * (1 + l * s * z) ** (1 / l) : m * Math.exp(s * z);
}

export function referenceMeasurement(standard, metric, day, z) {
  return measurementAt(lmsAt(standard, metric, day), z);
}

export function percentile(metric, value, date, standard = 'WHO') {
  const lms = lmsAt(standard, metric, ageInDays(date));
  if (!lms || !(value > 0)) return null;
  const [l, m, s] = lms;
  const low = measurementAt(lms, -3);
  const high = measurementAt(lms, 3);
  let z;
  if (standard === 'WHO' && value < low) z = -3 + (value - low) / (measurementAt(lms, -2) - low);
  else if (standard === 'WHO' && value > high) z = 3 + (value - high) / (high - measurementAt(lms, 2));
  else z = l ? ((value / m) ** l - 1) / (l * s) : Math.log(value / m) / s;

  // Standard normal CDF approximation.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const tail = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * t *
    (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 100 * (z < 0 ? tail : 1 - tail);
}
