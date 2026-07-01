package com.triadfs.api.controller;

import com.triadfs.api.dto.TransferRequests;
import com.triadfs.benchmark.metrics.CostModelService;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.transfer.service.TransferOrchestratorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/transfer")
public class TransferController extends BaseController {
    private final TransferOrchestratorService transferOrchestratorService;
    private final CostModelService costModelService;

    public TransferController(TransferOrchestratorService transferOrchestratorService, CostModelService costModelService) {
        this.transferOrchestratorService = transferOrchestratorService;
        this.costModelService = costModelService;
    }

    @GetMapping("/strategies")
    public ApiResponse<?> strategies(HttpServletRequest request) {
        return ok(request, transferOrchestratorService.supportedStrategies());
    }

    @PostMapping("/execute")
    public ApiResponse<?> execute(@Valid @RequestBody TransferRequests.TransferExecuteRequest payload,
                                  HttpServletRequest request) {
        byte[] bytes = Base64.getDecoder().decode(payload.payloadBase64());
        return ok(request, transferOrchestratorService.execute(
                SecurityContextHelper.currentUserId(),
                payload.fileNodeId(),
                bytes,
                payload.chunkSize(),
                payload.strategyType()
        ));
    }

    @PostMapping("/estimate-cost")
    public ApiResponse<?> estimateCost(@Valid @RequestBody TransferRequests.CostEstimateRequest payload,
                                       HttpServletRequest request) {
        return ok(request, Map.of(
                "costEstimateUsd", costModelService.estimateUsd(payload.bytesTransferred(), payload.durationMs(), payload.cpuUsagePercent())
        ));
    }
}