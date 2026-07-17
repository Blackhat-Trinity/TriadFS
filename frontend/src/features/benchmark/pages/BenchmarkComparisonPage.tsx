import { useQuery } from "@tanstack/react-query";
import { fetchBenchmarkRuns } from "@/api/benchmarks";
import { demoBenchmarks } from "@/lib/demo-data";
import { TransferSpeedChart } from "@/components/charts/TransferSpeedChart";
import { MemoryUsageChart } from "@/components/charts/MemoryUsageChart";
import { CostComparisonChart } from "@/components/charts/CostComparisonChart";
import { StrategyRankingTable } from "@/components/tables/StrategyRankingTable";

export function BenchmarkComparisonPage() {
  const { data } = useQuery({ queryKey: ["benchmarks"], queryFn: fetchBenchmarkRuns, retry: 0 });
  const rows = data && data.length > 0 ? data : demoBenchmarks;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <TransferSpeedChart data={rows} />
        <MemoryUsageChart data={rows} />
      </div>
      <CostComparisonChart data={rows} />
      <StrategyRankingTable data={rows} />
    </div>
  );
}