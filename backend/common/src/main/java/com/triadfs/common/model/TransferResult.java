package com.triadfs.common.model;

import java.util.List;

public record TransferResult(
        StrategyType strategyType,
        long transferTimeMs,
        double throughputMbps,
        long peakMemoryBytes,
        double cpuUsagePercent,
        long bytesTransferred,
        double compressionRatio,
        double dedupSavingsPercent,
        List<StoredChunkInfo> chunks
) {
}