package com.triadfs.common.model;

import java.util.UUID;

public record TransferRequest(
        UUID fileNodeId,
        byte[] payload,
        int chunkSize,
        StrategyType strategyType,
        boolean encryptionEnabled,
        boolean compressionEnabled
) {
}