import fs from "fs";
import path from "path";
import type { ProductionRecord } from "./types";

const file = path.join(process.cwd(), "data", "records.json");

export function readRecords(): ProductionRecord[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as ProductionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecord(record: ProductionRecord) {
  const next = [record, ...readRecords().filter((row) => row.recordId !== record.recordId)];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  return record;
}
