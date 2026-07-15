import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "@/api/benchmarks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoBenchmarks } from "@/lib/demo-data";
import { TransferSpeedChart } from "@/components/charts/TransferSpeedChart";
import { MemoryUsageChart } from "@/components/charts/MemoryUsageChart";
import { CostComparisonChart } from "@/components/charts/CostComparisonChart";
import { DedupCompressionChart } from "@/components/charts/DedupCompressionChart";
import { StrategyRankingTable } from "@/components/tables/StrategyRankingTable";

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    retry: 0
  });

  const benchmarks = data && data.length > 0 ? data : demoBenchmarks;

  const avgSpeed = benchmarks.reduce((acc, row) => acc + row.throughputMbps, 0) / benchmarks.length;
  const avgMemory = benchmarks.reduce((acc, row) => acc + row.peakMemoryMb, 0) / benchmarks.length;
  const avgCost = benchmarks.reduce((acc, row) => acc + row.costEstimateUsd, 0) / benchmarks.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Average Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{avgSpeed.toFixed(0)} Mbps</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Average Peak Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{avgMemory.toFixed(0)} MB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Average Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">${avgCost.toFixed(4)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TransferSpeedChart data={benchmarks} />
        <MemoryUsageChart data={benchmarks} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CostComparisonChart data={benchmarks} />
        <DedupCompressionChart data={benchmarks} />
      </div>

      <StrategyRankingTable data={benchmarks} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading latest benchmark runs...</p>}
    </div>
  );
}