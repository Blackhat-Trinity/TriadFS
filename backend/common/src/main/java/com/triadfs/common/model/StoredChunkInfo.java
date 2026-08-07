package com.triadfs.common.model;

import java.util.UUID;

public record StoredChunkInfo(
        UUID chunkId,
        String sha256,
        int chunkSize,
        int chunkOrder,
        boolean deduplicated
) {
}