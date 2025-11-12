export function estimateEtaSeconds(total: number, completed: number, parallelism = 4, secondsPerItem = 60): number {
  const remaining = Math.max(0, total - completed);
  const waves = Math.ceil(remaining / Math.max(1, parallelism));
  return waves * secondsPerItem;
}


