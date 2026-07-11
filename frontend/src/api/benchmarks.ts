import { http } from "./http";
import type { BenchmarkSummary } from "@/types";

interface Envelope<T> {
  data: T;
}

export async function fetchBenchmarkRuns(): Promise<BenchmarkSummary[]> {
  const response = await http.get<Envelope<BenchmarkSummary[]>>("/benchmarks/runs");
  return response.data.data;
}

export async function fetchLeaderboard(): Promise<BenchmarkSummary[]> {
  const response = await http.get<Envelope<BenchmarkSummary[]>>("/benchmarks/leaderboard");
  return response.data.data;
}

export async function runBenchmark(payload: {
  fileNodeId: string;
  scenarioName: string;
  chunkSize: number;
  payloadSizeBytes: number;
  iterations: number;
  strategies: string[];
}): Promise<BenchmarkSummary[]> {
  const response = await http.post<Envelope<BenchmarkSummary[]>>("/benchmarks/runs", payload);
  return response.data.data;
}