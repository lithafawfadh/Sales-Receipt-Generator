export const formatLKR = (amount: number): string => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const roundToTwo = (num: number): number => {
  return +(Math.round(Number(num + "e+2")) + "e-2");
};