package com.triadfs.common.model;

import java.time.Instant;
import java.util.Map;

public record ApiError(String code, String message, Map<String, Object> details, String traceId, Instant timestamp) {
    public static ApiError of(String code, String message, Map<String, Object> details, String traceId) {
        return new ApiError(code, message, details, traceId, Instant.now());
    }
}