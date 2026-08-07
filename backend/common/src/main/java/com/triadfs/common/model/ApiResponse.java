package com.triadfs.common.model;

import java.time.Instant;
import java.util.Map;

public record ApiResponse<T>(T data, Map<String, Object> meta, String traceId, Instant timestamp) {
    public static <T> ApiResponse<T> of(T data, Map<String, Object> meta, String traceId) {
        return new ApiResponse<>(data, meta, traceId, Instant.now());
    }
}