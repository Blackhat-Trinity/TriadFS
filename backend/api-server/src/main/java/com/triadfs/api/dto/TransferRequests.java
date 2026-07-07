package com.triadfs.api.dto;

import com.triadfs.common.model.StrategyType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public final class TransferRequests {
    private TransferRequests() {
    }

    public record TransferExecuteRequest(
            @NotNull UUID fileNodeId,
            @NotNull StrategyType strategyType,
            @NotBlank String payloadBase64,
            @Min(1024) int chunkSize
    ) {
    }

    public record CostEstimateRequest(@Min(1) long bytesTransferred,
                                      @Min(1) long durationMs,
                                      double cpuUsagePercent) {
    }
}