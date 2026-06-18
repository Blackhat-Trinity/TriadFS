package com.triadfs.api.controller;

import com.triadfs.api.config.TraceIdFilter;
import com.triadfs.common.model.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

public abstract class BaseController {
    protected <T> ApiResponse<T> ok(HttpServletRequest request, T data) {
        Object traceId = request.getAttribute(TraceIdFilter.TRACE_ID_ATTR);
        return ApiResponse.of(data, Map.of(), traceId == null ? "unknown" : traceId.toString());
    }
}