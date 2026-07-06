package com.triadfs.api.dto;

import jakarta.validation.constraints.Min;

public final class SettingsRequests {
    private SettingsRequests() {
    }

    public record StrategyConfigRequest(@Min(1024) int defaultChunkSize, boolean encryptionEnabled, boolean compressionEnabled) {
    }

    public record SecuritySettingsRequest(boolean checksumValidation, boolean aesOptional) {
    }
}