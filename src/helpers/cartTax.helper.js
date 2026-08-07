
const VISITATION_FEE = 79;
const VISITATION_FEE_THRESHOLD = 600; 
const GOVT_TAX_RATE = 0.02; 


const PLATFORM_FEE_TIERS = [
  { max: 1000, rate: 0.12 },
  { max: 2000, rate: 0.10 },
  { max: 5000, rate: 0.05 },
  { max: Infinity, rate: 0.02 },
];

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
const roundToNearest = (num) => Math.round(num);

function getPlatformFeeRate(subtotal) {
  for (const tier of PLATFORM_FEE_TIERS) {
    if (subtotal < tier.max) return tier.rate;
  }
  return PLATFORM_FEE_TIERS[PLATFORM_FEE_TIERS.length - 1].rate;
}


function computeCategoryCharges(subtotal) {
  const visitationFee = subtotal < VISITATION_FEE_THRESHOLD ? VISITATION_FEE : 0;
  const govtTax = roundToNearest(subtotal * GOVT_TAX_RATE);
  const platformFeeRate = getPlatformFeeRate(subtotal);
  const platformFee = roundToNearest(subtotal * platformFeeRate);

  const categoryTotal = roundToNearest(subtotal + visitationFee + govtTax + platformFee);

  return {
    subtotal: roundToNearest(subtotal),
    charges: {
      visitationFee,
      govtTax,
      platformFee,
    },
    categoryTotal,
  };
}

export { computeCategoryCharges, round2, roundToNearest };
export default { computeCategoryCharges, round2, roundToNearest };