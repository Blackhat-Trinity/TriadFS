package com.triadfs.api.dto;

import com.triadfs.common.model.StrategyType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public final class BenchmarkRequests {
    private BenchmarkRequests() {
    }

    public record BenchmarkRunRequest(
            @NotNull UUID fileNodeId,
            @NotBlank String scenarioName,
            @Min(1024) int chunkSize,
            @Min(1024) int payloadSizeBytes,
            @Min(1) int iterations,
            List<StrategyType> strategies
    ) {
    }

    public record CompareRequest(@NotNull List<UUID> runIds) {
    }
}