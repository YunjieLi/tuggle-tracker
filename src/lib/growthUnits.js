const unitFactors = { kg: 1, lb: 0.45359237, cm: 1, inch: 2.54 };

const combinedUnits = {
  'lb+oz': { factor: 0.45359237, parts: 16 },
  'ft+inch': { factor: 30.48, parts: 12 },
};

export function measurementToBase(value, unit, secondary = '') {
  if (value === '' && secondary === '') return null;
  const combined = combinedUnits[unit];
  const amount = combined ? Number(value) + Number(secondary) / combined.parts : Number(value);
  return amount * (combined?.factor ?? unitFactors[unit]);
}

export function measurementFromBase(value, unit) {
  if (value === null) return { value: '', secondary: '' };
  const combined = combinedUnits[unit];
  const amount = value / (combined?.factor ?? unitFactors[unit]);
  const rounded = Number(amount.toFixed(2));
  if (!combined) return { value: String(rounded), secondary: '' };
  const totalParts = Number((amount * combined.parts).toFixed(2));
  return {
    value: String(Math.floor(totalParts / combined.parts)),
    secondary: String(Number((totalParts % combined.parts).toFixed(2))),
  };
}
