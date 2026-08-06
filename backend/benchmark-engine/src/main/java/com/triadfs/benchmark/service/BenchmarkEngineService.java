package com.triadfs.benchmark.service;

import com.triadfs.benchmark.metrics.CostModelService;
import com.triadfs.common.model.BenchmarkSummary;
import com.triadfs.common.model.StrategyType;
import com.triadfs.common.model.TransferResult;
import com.triadfs.metadata.model.BenchmarkRunEntity;
import com.triadfs.metadata.model.BenchmarkStatus;
import com.triadfs.metadata.service.BenchmarkRunService;
import com.triadfs.transfer.service.TransferOrchestratorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class BenchmarkEngineService {
    private final TransferOrchestratorService transferOrchestratorService;
    private final BenchmarkRunService benchmarkRunService;
    private final CostModelService costModelService;

    public BenchmarkEngineService(TransferOrchestratorService transferOrchestratorService,
                                  BenchmarkRunService benchmarkRunService,
                                  CostModelService costModelService) {
        this.transferOrchestratorService = transferOrchestratorService;
        this.benchmarkRunService = benchmarkRunService;
        this.costModelService = costModelService;
    }

    public List<BenchmarkSummary> run(BenchmarkRequest request) {
        List<BenchmarkSummary> summaries = new ArrayList<>();
        List<StrategyType> strategies = request.strategies() == null || request.strategies().isEmpty()
                ? transferOrchestratorService.supportedStrategies()
                : request.strategies();

        for (StrategyType strategyType : strategies) {
            for (int i = 0; i < Math.max(1, request.iterations()); i++) {
                byte[] payload = generatePayload(request.payloadSizeBytes());
                Instant startedAt = Instant.now();
                TransferResult transferResult = transferOrchestratorService.execute(
                        request.actorId(),
                        request.fileNodeId(),
                        payload,
                        request.chunkSize(),
                        strategyType
                );
                Instant finishedAt = Instant.now();

                BenchmarkRunEntity run = new BenchmarkRunEntity();
                run.setId(UUID.randomUUID());
                run.setInitiatedBy(request.actorId());
                run.setScenarioName(request.scenarioName());
                run.setStrategyName(strategyType);
                run.setDatasetSizeBytes(payload.length);
                run.setTransferTimeMs(transferResult.transferTimeMs());
                run.setThroughputMbps(transferResult.throughputMbps());
                run.setPeakMemoryMb(Math.max(1, transferResult.peakMemoryBytes() / (1024 * 1024)));
                run.setCpuUsagePercent(transferResult.cpuUsagePercent());
                run.setBytesTransferred(transferResult.bytesTransferred());
                run.setCompressionRatio(transferResult.compressionRatio());
                run.setDedupSavingsPercent(transferResult.dedupSavingsPercent());
                run.setCostEstimateUsd(costModelService.estimateUsd(
                        transferResult.bytesTransferred(),
                        transferResult.transferTimeMs(),
                        transferResult.cpuUsagePercent()));
                run.setStatus(BenchmarkStatus.SUCCEEDED);
                run.setStartedAt(startedAt);
                run.setFinishedAt(finishedAt);

                BenchmarkRunEntity savedRun = Objects.requireNonNull(benchmarkRunService.save(run));
                summaries.add(BenchmarkRunService.toSummary(savedRun));
            }
        }
        return summaries;
    }

    public List<BenchmarkSummary> latestRuns() {
        return benchmarkRunService.latest();
    }

    public BenchmarkSummary getRun(UUID runId) {
        UUID nonNullRunId = Objects.requireNonNull(runId);
        BenchmarkRunEntity run = Objects.requireNonNull(benchmarkRunService.get(nonNullRunId));
        return BenchmarkRunService.toSummary(run);
    }

    public List<BenchmarkSummary> leaderboard() {
        return benchmarkRunService.leaderboard();
    }

    private byte[] generatePayload(int size) {
        byte[] payload = new byte[Math.max(1024, size)];
        new SecureRandom().nextBytes(payload);
        return payload;
    }
}
