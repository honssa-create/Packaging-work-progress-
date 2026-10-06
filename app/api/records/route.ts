import { NextResponse } from "next/server";
import { summarize } from "@/lib/performance";
import { addRecord, readRecords } from "@/lib/store";
import { parseRecord } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(readRecords());
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }

  const parsed = parseRecord(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const metrics = summarize(parsed.record.capacity, parsed.record.netDurationSeconds, parsed.record.details);
  if (metrics.totalGoodQty + metrics.totalDefectQty === 0) {
    return NextResponse.json({ error: "請至少填寫一件數量" }, { status: 400 });
  }

  const saved = addRecord({ ...parsed.record, ...metrics });
  return NextResponse.json(saved, { status: 201 });
}
