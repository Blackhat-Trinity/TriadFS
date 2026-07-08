package com.triadfs.api.exception;

import com.triadfs.api.config.TraceIdFilter;
import com.triadfs.common.error.TriadFsException;
import com.triadfs.common.model.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(TriadFsException.class)
    public ResponseEntity<ApiError> handleTriad(TriadFsException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(ApiError.of(ex.getCode(), ex.getMessage(), Map.of(), traceId(request)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArg(IllegalArgumentException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(ApiError.of("BAD_REQUEST", ex.getMessage(), Map.of(), traceId(request)));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, Object> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> details.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of("VALIDATION_ERROR", "Request validation failed", details, traceId(request)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnknown(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("INTERNAL_ERROR", ex.getMessage(), Map.of(), traceId(request)));
    }

    private String traceId(HttpServletRequest request) {
        Object traceId = request.getAttribute(TraceIdFilter.TRACE_ID_ATTR);
        return traceId == null ? "unknown" : traceId.toString();
    }
}