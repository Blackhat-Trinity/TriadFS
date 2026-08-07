package com.triadfs.benchmark.service;

import com.triadfs.common.model.StrategyType;

import java.util.List;
import java.util.UUID;

public record BenchmarkRequest(
        UUID actorId,
        UUID fileNodeId,
        String scenarioName,
        int chunkSize,
        int payloadSizeBytes,
        int iterations,
        List<StrategyType> strategies
) {
}