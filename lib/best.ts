import type { ProcessStep, ProductionRecord } from "./types";
import { STEPS } from "./orders";

export function scoredRecords(records: ProductionRecord[]) {
  return records.filter((row) => row.totalGoodQty > 0 && row.secPerItem > 0);
}

export function bestOverall(records: ProductionRecord[]) {
  return scoredRecords(records).slice().sort((a, b) => a.secPerItem - b.secPerItem)[0];
}

export function bestByStep(records: ProductionRecord[]) {
  const scored = scoredRecords(records);
  return STEPS.map((step) => {
    const rows = scored.filter((row) => row.processStep === step).sort((a, b) => a.secPerItem - b.secPerItem);
    return { step, record: rows[0] as ProductionRecord | undefined };
  });
}

export function bestFor(records: ProductionRecord[], step: ProcessStep, capacity: string) {
  return scoredRecords(records)
    .filter((row) => row.processStep === step && row.capacity === capacity)
    .sort((a, b) => a.secPerItem - b.secPerItem)[0];
}
