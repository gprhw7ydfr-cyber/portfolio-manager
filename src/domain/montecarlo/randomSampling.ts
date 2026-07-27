/** Box-Muller normal sampling — one pair of independent standard normals per call, one used,
 *  discarding the other rather than caching it (simplicity over the extra ~2x throughput). */
export function sampleNormal(mean: number, stdDev: number, min?: number, max?: number): number {
  if (stdDev <= 0) return clamp(mean, min, max);

  const u1 = Math.max(Math.random(), Number.EPSILON);
  const u2 = Math.random();
  const standardNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return clamp(mean + standardNormal * stdDev, min, max);
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}
