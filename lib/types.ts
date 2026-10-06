export type Flavor = "冰糖" | "桂花" | "紅棗";
export type Capacity = "25g" | "45g" | "75g";
export type ProcessStep = "抹樽" | "貼貼紙" | "掛卡+入袋+入箱";
export type PerformanceRating = "EXCELLENT" | "GOOD" | "NORMAL";

export interface ProductionRecord {
  recordId: string;
  workerId: string;
  workerName: string;
  orderNo: string;
  capacity: Capacity;
  processStep: ProcessStep;
  startTime: string;
  endTime: string;
  netDurationSeconds: number;
  pausedDurationSeconds: number;
  details: {
    flavor: Flavor;
    goodQty: number;
    defectQty: number;
  }[];
  totalGoodQty: number;
  totalDefectQty: number;
  yieldRate: number;
  secPerItem: number;
  itemsPerHour: number;
  performanceRating: PerformanceRating;
}

export interface Order {
  orderNo: string;
  product: string;
  capacity: Capacity;
  flavors: Flavor[];
  planQty: number;
}
