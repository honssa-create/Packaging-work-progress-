import { RecordList } from "@/components/RecordList";
import { bestByStep } from "@/lib/best";
import { readRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const all = readRecords();
  const records = all.filter((record) => {
    if (!query) return true;
    return [record.orderNo, record.workerName, record.processStep, record.capacity].some((value) =>
      value.includes(query),
    );
  });

  return <RecordList records={records} best={bestByStep(all)} query={query} />;
}
