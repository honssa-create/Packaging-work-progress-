import type { Capacity, PerformanceRating } from "./types";

const LOW_DEFECT = 0.02;
const OK_DEFECT = 0.05;

export function speedLimit(capacity: Capacity) {
  return capacity === "75g" ? 7 : 5;
}

function round(n: number, digits: number) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function summarize(
  capacity: Capacity,
  netDurationSeconds: number,
  details: { goodQty: number; defectQty: number }[],
) {
  const totalGoodQty = details.reduce((sum, row) => sum + row.goodQty, 0);
  const totalDefectQty = details.reduce((sum, row) => sum + row.defectQty, 0);
  const total = totalGoodQty + totalDefectQty;
  const yieldRate = total === 0 ? 0 : round((totalGoodQty / total) * 100, 1);
  const secPerItem =
    totalGoodQty > 0 && netDurationSeconds > 0
      ? round(netDurationSeconds / totalGoodQty, 2)
      : 0;
  const itemsPerHour =
    netDurationSeconds > 0 ? round(totalGoodQty / (netDurationSeconds / 3600), 1) : 0;
  const defectRate = total === 0 ? 1 : totalDefectQty / total;
  const limit = speedLimit(capacity);

  let performanceRating: PerformanceRating = "NORMAL";
  if (secPerItem > 0 && secPerItem <= limit && defectRate <= LOW_DEFECT) {
    performanceRating = "EXCELLENT";
  } else if (secPerItem > 0 && secPerItem <= limit * 1.6 && defectRate <= OK_DEFECT) {
    performanceRating = "GOOD";
  }

  return { totalGoodQty, totalDefectQty, yieldRate, secPerItem, itemsPerHour, performanceRating };
}
