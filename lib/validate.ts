import { findOrder } from "./orders";
import type { Capacity, Flavor, ProcessStep, ProductionRecord } from "./types";

const CAPACITIES: Capacity[] = ["25g", "45g", "75g"];
const STEPS: ProcessStep[] = ["抹樽", "貼貼紙", "掛卡+入袋+入箱"];
const FLAVORS: Flavor[] = ["冰糖", "桂花", "紅棗"];

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function int(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1_000_000;
}

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

export function parseRecord(body: unknown): { record: ProductionRecord } | { error: string } {
  if (!body || typeof body !== "object") return { error: "缺少紀錄內容" };
  const row = body as Partial<ProductionRecord>;
  const order = typeof row.orderNo === "string" ? findOrder(row.orderNo) : undefined;

  if (!text(row.recordId, 80)) return { error: "recordId 無效" };
  if (!text(row.workerId, 80) || !text(row.workerName, 40)) return { error: "員工資料無效" };
  if (!order) return { error: "找不到此訂單" };
  if (!isOneOf(CAPACITIES, row.capacity) || row.capacity !== order.capacity) return { error: "容量規格不符" };
  if (!isOneOf(STEPS, row.processStep)) return { error: "工序無效" };
  if (!int(row.netDurationSeconds) || !int(row.pausedDurationSeconds)) return { error: "工時無效" };

  const start = Date.parse(String(row.startTime));
  const end = Date.parse(String(row.endTime));
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return { error: "時間戳無效" };
  if (!Array.isArray(row.details)) return { error: "缺少味道數量" };

  const details = row.details.map((item) => ({
    flavor: item?.flavor,
    goodQty: item?.goodQty,
    defectQty: item?.defectQty,
  }));
  if (details.length !== order.flavors.length) return { error: "味道欄位需與訂單一致" };
  const seen = new Set<string>();
  for (const item of details) {
    if (!isOneOf(FLAVORS, item.flavor) || !order.flavors.includes(item.flavor) || seen.has(item.flavor)) {
      return { error: "味道欄位無效" };
    }
    if (!int(item.goodQty) || !int(item.defectQty)) return { error: "數量需為整數" };
    seen.add(item.flavor);
  }
  if ([...seen].sort().join() !== [...order.flavors].sort().join()) return { error: "味道欄位需與訂單一致" };

  return {
    record: {
      recordId: row.recordId!.trim(),
      workerId: row.workerId!.trim(),
      workerName: row.workerName!.trim(),
      orderNo: order.orderNo,
      capacity: order.capacity,
      processStep: row.processStep,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      netDurationSeconds: row.netDurationSeconds!,
      pausedDurationSeconds: row.pausedDurationSeconds!,
      details: details as ProductionRecord["details"],
      totalGoodQty: 0,
      totalDefectQty: 0,
      yieldRate: 0,
      secPerItem: 0,
      itemsPerHour: 0,
      performanceRating: "NORMAL",
    },
  };
}
