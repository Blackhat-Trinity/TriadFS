import { BenchmarkSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DedupCompressionChart({ data }: { data: BenchmarkSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dedup Savings vs Compression Ratio</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="strategyType" />
            <YAxis yAxisId="left" unit=" %" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="dedupSavingsPercent" fill="#f97316" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="compressionRatio" stroke="#0ea5e9" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}