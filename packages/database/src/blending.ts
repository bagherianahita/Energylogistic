/**
 * Industry-standard diluent blending constraint.
 * Required Diluent (bbl) = (targetRatio × bitumenVolume) / (1 - targetRatio)
 *
 * @param bitumenVolumeBbls - Scheduled bitumen volume in barrels
 * @param targetRatio - Diluent fraction of total blend (typically 0.20–0.30)
 */
export function calculateRequiredDiluent(
  bitumenVolumeBbls: number,
  targetRatio: number
): number {
  if (targetRatio <= 0 || targetRatio >= 1) {
    throw new Error("Target ratio must be between 0 and 1 (exclusive)");
  }
  if (bitumenVolumeBbls < 0) {
    throw new Error("Bitumen volume cannot be negative");
  }
  return (targetRatio * bitumenVolumeBbls) / (1 - targetRatio);
}

/**
 * Total blended volume after adding required diluent.
 */
export function calculateBlendedVolume(
  bitumenVolumeBbls: number,
  targetRatio: number
): number {
  return bitumenVolumeBbls + calculateRequiredDiluent(bitumenVolumeBbls, targetRatio);
}

/**
 * Returns true when available diluent inventory is insufficient for the blend.
 */
export function isInventoryDepleted(
  availableDiluentBbls: number,
  requiredDiluentBbls: number
): boolean {
  return availableDiluentBbls < requiredDiluentBbls;
}

/**
 * Pipeline utilization as a percentage of max daily capacity.
 */
export function calculateUtilizationRate(
  currentFlowBblsPerDay: number,
  maxDailyCapacityBbls: number
): number {
  if (maxDailyCapacityBbls <= 0) return 0;
  return Math.min(100, (currentFlowBblsPerDay / maxDailyCapacityBbls) * 100);
}

/**
 * Residual capacity available on a pipeline segment (bbl/day).
 */
export function calculateResidualCapacity(
  currentFlowBblsPerDay: number,
  maxDailyCapacityBbls: number
): number {
  return Math.max(0, maxDailyCapacityBbls - currentFlowBblsPerDay);
}
