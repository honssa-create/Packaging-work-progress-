import type { Order, ProcessStep } from "./types";

/** Mock ClickUp orders. Each task only lists the flavors it actually needs. */
export const ORDERS: Order[] = [
  { orderNo: "PO-001", product: "冰糖燉梨", capacity: "45g", flavors: ["冰糖"], planQty: 120 },
  { orderNo: "PO-002", product: "雙味茶飲", capacity: "25g", flavors: ["冰糖", "桂花"], planQty: 200 },
  { orderNo: "PO-003", product: "三味禮盒", capacity: "75g", flavors: ["冰糖", "桂花", "紅棗"], planQty: 80 },
  { orderNo: "PO-004", product: "紅棗圓茶", capacity: "25g", flavors: ["紅棗"], planQty: 160 },
  { orderNo: "PO-005", product: "桂花紅棗", capacity: "75g", flavors: ["桂花", "紅棗"], planQty: 90 },
  { orderNo: "PO-006", product: "冰糖紅棗", capacity: "45g", flavors: ["冰糖", "紅棗"], planQty: 140 },
];

export const STEPS: ProcessStep[] = ["抹樽", "貼貼紙", "掛卡+入袋+入箱"];

export function findOrder(orderNo: string) {
  return ORDERS.find((order) => order.orderNo === orderNo);
}
