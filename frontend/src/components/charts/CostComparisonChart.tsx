import { BenchmarkSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#0ea5e9", "#f97316", "#22c55e", "#a78bfa", "#ef4444", "#14b8a6"];

export function CostComparisonChart({ data }: { data: BenchmarkSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Distribution by Strategy</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="costEstimateUsd"
              nameKey="strategyType"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.runId} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}