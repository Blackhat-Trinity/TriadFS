package com.triadfs.api.controller;

import com.triadfs.api.dto.BenchmarkRequests;
import com.triadfs.benchmark.service.BenchmarkEngineService;
import com.triadfs.benchmark.service.BenchmarkRequest;
import com.triadfs.common.model.ApiResponse;
import com.triadfs.common.model.BenchmarkSummary;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/benchmarks")
public class BenchmarkController extends BaseController {
    private final BenchmarkEngineService benchmarkEngineService;

    public BenchmarkController(BenchmarkEngineService benchmarkEngineService) {
        this.benchmarkEngineService = benchmarkEngineService;
    }

    @PostMapping("/runs")
    public ApiResponse<?> run(@Valid @RequestBody BenchmarkRequests.BenchmarkRunRequest payload,
                              HttpServletRequest request) {
        List<BenchmarkSummary> runs = benchmarkEngineService.run(new BenchmarkRequest(
                SecurityContextHelper.currentUserId(),
                payload.fileNodeId(),
                payload.scenarioName(),
                payload.chunkSize(),
                payload.payloadSizeBytes(),
                payload.iterations(),
                payload.strategies()
        ));
        return ok(request, runs);
    }

    @GetMapping("/runs")
    public ApiResponse<?> runs(HttpServletRequest request) {
        return ok(request, benchmarkEngineService.latestRuns());
    }

    @GetMapping("/runs/{runId}")
    public ApiResponse<?> runById(@PathVariable UUID runId, HttpServletRequest request) {
        return ok(request, benchmarkEngineService.getRun(runId));
    }

    @PostMapping("/compare")
    public ApiResponse<?> compare(@Valid @RequestBody BenchmarkRequests.CompareRequest payload,
                                  HttpServletRequest request) {
        List<BenchmarkSummary> selected = benchmarkEngineService.latestRuns().stream()
                .filter(run -> payload.runIds().contains(run.runId()))
                .toList();
        return ok(request, selected);
    }

    @GetMapping("/leaderboard")
    public ApiResponse<?> leaderboard(HttpServletRequest request) {
        return ok(request, benchmarkEngineService.leaderboard());
    }
}
