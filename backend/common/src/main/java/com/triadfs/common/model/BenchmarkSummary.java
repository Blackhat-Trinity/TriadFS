package com.triadfs.common.model;

import java.time.Instant;
import java.util.UUID;

public record BenchmarkSummary(
        UUID runId,
        String scenarioName,
        StrategyType strategyType,
        long transferTimeMs,
        double throughputMbps,
        long peakMemoryMb,
        double cpuUsagePercent,
        long bytesTransferred,
        double compressionRatio,
        double dedupSavingsPercent,
        double costEstimateUsd,
        Instant startedAt,
        Instant finishedAt
) {
}