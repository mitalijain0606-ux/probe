export function bigIntToNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'bigint' ? Number(value) : value;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function uptimePercentage(successfulChecks: number, totalChecks: number): number {
  if (totalChecks <= 0) return 0;
  return round((successfulChecks / totalChecks) * 100, 2);
}
