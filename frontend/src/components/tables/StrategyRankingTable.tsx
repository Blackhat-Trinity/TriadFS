import { BenchmarkSummary } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function StrategyRankingTable({ data }: { data: BenchmarkSummary[] }) {
  const ranked = [...data].sort((a, b) => a.transferTimeMs - b.transferTimeMs || a.costEstimateUsd - b.costEstimateUsd);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Performance Ranking</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Time (ms)</TableHead>
              <TableHead>Memory (MB)</TableHead>
              <TableHead>Cost (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((item, index) => (
              <TableRow key={item.runId}>
                <TableCell>
                  <Badge variant={index === 0 ? "default" : "secondary"}>#{index + 1}</Badge>
                </TableCell>
                <TableCell className="font-medium">{item.strategyType}</TableCell>
                <TableCell>{item.transferTimeMs.toLocaleString()}</TableCell>
                <TableCell>{item.peakMemoryMb}</TableCell>
                <TableCell>${item.costEstimateUsd.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}