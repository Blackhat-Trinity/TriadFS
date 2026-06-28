package com.triadfs.api.controller;

import com.triadfs.api.dto.SettingsRequests;
import com.triadfs.api.service.RuntimeSettingsService;
import com.triadfs.common.model.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController extends BaseController {
    private final RuntimeSettingsService runtimeSettingsService;

    public SettingsController(RuntimeSettingsService runtimeSettingsService) {
        this.runtimeSettingsService = runtimeSettingsService;
    }

    @GetMapping("/strategies")
    public ApiResponse<?> strategies(HttpServletRequest request) {
        return ok(request, runtimeSettingsService.strategySettings());
    }

    @PutMapping("/strategies/default")
    public ApiResponse<?> updateStrategies(@Valid @RequestBody SettingsRequests.StrategyConfigRequest payload,
                                           HttpServletRequest request) {
        return ok(request, runtimeSettingsService.updateStrategy(payload));
    }

    @GetMapping("/security")
    public ApiResponse<?> security(HttpServletRequest request) {
        return ok(request, runtimeSettingsService.securitySettings());
    }

    @PutMapping("/security")
    public ApiResponse<?> security(@Valid @RequestBody SettingsRequests.SecuritySettingsRequest payload,
                                   HttpServletRequest request) {
        return ok(request, runtimeSettingsService.updateSecurity(payload));
    }
}
