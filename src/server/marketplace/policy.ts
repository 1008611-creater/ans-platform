/** Unified ANS credits remain the sole currency for new on-site purchases. */
export function marketPointsOnly() {
  return process.env.ANS_UNIFIED_POINTS_ENABLED === "1";
}
