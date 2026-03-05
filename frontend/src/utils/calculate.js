import currency from 'currency.js';

/**
 * Parses unit floor string to integer.
 * Ground / Stilt / Basement → 0; First → 1; Second → 2; Third → 3; etc.
 * @param {string|number} unitFloorStr - Floor as string or number
 * @returns {number} 0 for ground/stilt/basement, 1+ for upper floors, 0 if unparseable
 */
export function parseFloorStringToInt(unitFloorStr) {
  if (unitFloorStr == null || unitFloorStr === '') return 0;
  const n = parseInt(unitFloorStr, 10);
  if (!Number.isNaN(n) && n >= 0) return n;
  const s = String(unitFloorStr).trim().toLowerCase();
  const floorMap = {
    ground: 0, g: 0, stilt: 0, basement: 0, 0: 0,
    first: 1, 1: 1, one: 1,
    second: 2, 2: 2, two: 2,
    third: 3, 3: 3, three: 3,
    fourth: 4, 4: 4, four: 4,
    fifth: 5, 5: 5, five: 5,
    sixth: 6, 6: 6, six: 6,
    seventh: 7, 7: 7, seven: 7,
    eighth: 8, 8: 8, eight: 8,
    ninth: 9, 9: 9, nine: 9,
    tenth: 10, 10: 10, ten: 10,
  };
  if (floorMap[s] !== undefined) return floorMap[s];
  const numFromWord = parseInt(s, 10);
  return Number.isNaN(numFromWord) ? 0 : Math.max(0, numFromWord);
}

/**
 * Cumulative per-floor increment: Floor 1 = +5%, Floor 2 = +10%, Floor 3 = +15%, etc.
 * Ground (0) or below gets base rate. Multiplier = 1 + (percentage/100) * currentFloor.
 * @param {number} baseRate - Base rate (e.g. from WorkRate)
 * @param {string|number} unitFloorStr - Unit floor (e.g. "First", "2", "Ground")
 * @param {{ isActive?: boolean, percentageIncrement?: number }|null|undefined} incrementRule
 * @returns {number} Effective rate after cumulative increment
 */
export function calculateDynamicRate(baseRate, unitFloorStr, incrementRule) {
  if (!incrementRule || !incrementRule.isActive || !incrementRule.percentageIncrement) return baseRate;

  const currentFloor = parseFloorStringToInt(unitFloorStr);

  if (currentFloor <= 0) return baseRate;

  const incrementMultiplier = 1 + (incrementRule.percentageIncrement / 100) * currentFloor;
  return Number(currency(baseRate).multiply(incrementMultiplier).value);
}

const calculate = {
  add: (firstValue, secondValue) => {
    return currency(firstValue).add(secondValue).value;
  },
  sub: (firstValue, secondValue) => {
    return currency(firstValue).subtract(secondValue).value;
  },
  multiply: (firstValue, secondValue) => {
    return currency(firstValue).multiply(secondValue).value;
  },
  divide: (firstValue, secondValue) => {
    return currency(firstValue).divide(secondValue).value;
  },
};

export default calculate;
