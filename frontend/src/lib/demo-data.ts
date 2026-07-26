import type { BenchmarkSummary, FileNode } from "@/types";

export const demoBenchmarks: BenchmarkSummary[] = [
  {
    runId: "run-1",
    scenarioName: "1GB WAN simulation",
    strategyType: "PARALLEL_CHUNK",
    transferTimeMs: 2150,
    throughputMbps: 950,
    peakMemoryMb: 384,
    cpuUsagePercent: 62,
    bytesTransferred: 950_000_000,
    compressionRatio: 0.98,
    dedupSavingsPercent: 18,
    costEstimateUsd: 0.21,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  },
  {
    runId: "run-2",
    scenarioName: "1GB WAN simulation",
    strategyType: "COMPRESSED",
    transferTimeMs: 2840,
    throughputMbps: 710,
    peakMemoryMb: 310,
    cpuUsagePercent: 71,
    bytesTransferred: 680_000_000,
    compressionRatio: 0.71,
    dedupSavingsPercent: 11,
    costEstimateUsd: 0.16,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  },
  {
    runId: "run-3",
    scenarioName: "1GB WAN simulation",
    strategyType: "STREAMING",
    transferTimeMs: 3290,
    throughputMbps: 592,
    peakMemoryMb: 170,
    cpuUsagePercent: 49,
    bytesTransferred: 1_000_000_000,
    compressionRatio: 1,
    dedupSavingsPercent: 8,
    costEstimateUsd: 0.24,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  }
];

export const demoTree: FileNode[] = [
  {
    id: "root-a",
    name: "datasets",
    path: "/datasets",
    nodeType: "FOLDER",
    children: [
      { id: "f-1", name: "image-corpus-v3.tar", path: "/datasets/image-corpus-v3.tar", nodeType: "FILE", children: [] },
      { id: "f-2", name: "sensor-archive.zst", path: "/datasets/sensor-archive.zst", nodeType: "FILE", children: [] }
    ]
  },
  {
    id: "root-b",
    name: "benchmarks",
    path: "/benchmarks",
    nodeType: "FOLDER",
    children: [
      { id: "f-3", name: "run-2026-03-26.json", path: "/benchmarks/run-2026-03-26.json", nodeType: "FILE", children: [] }
    ]
  }
];