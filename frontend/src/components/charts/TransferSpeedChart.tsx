import { BenchmarkSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TransferSpeedChart({ data }: { data: BenchmarkSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Speed Comparison</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="strategyType" />
            <YAxis unit=" Mbps" />
            <Tooltip />
            <Bar dataKey="throughputMbps" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}