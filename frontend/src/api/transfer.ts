import { http } from "./http";
import type { StrategyType, BenchmarkSummary } from "@/types";

interface Envelope<T> {
  data: T;
}

export async function listStrategies(): Promise<StrategyType[]> {
  const response = await http.get<Envelope<StrategyType[]>>("/transfer/strategies");
  return response.data.data;
}

export async function runTransfer(payload: {
  fileNodeId: string;
  strategyType: StrategyType;
  payloadBase64: string;
  chunkSize: number;
}): Promise<BenchmarkSummary | Record<string, unknown>> {
  const response = await http.post<Envelope<BenchmarkSummary | Record<string, unknown>>>("/transfer/execute", payload);
  return response.data.data;
}