package com.triadfs.metadata.model;

import com.triadfs.common.model.StrategyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "benchmark_runs")
public class BenchmarkRunEntity {
    @Id
    private UUID id;

    @Column(name = "initiated_by", nullable = false)
    private UUID initiatedBy;

    @Column(name = "scenario_name", nullable = false)
    private String scenarioName;

    @Enumerated(EnumType.STRING)
    @Column(name = "strategy_name", nullable = false)
    private StrategyType strategyName;

    @Column(name = "dataset_size_bytes", nullable = false)
    private long datasetSizeBytes;

    @Column(name = "transfer_time_ms", nullable = false)
    private long transferTimeMs;

    @Column(name = "throughput_mbps", nullable = false)
    private double throughputMbps;

    @Column(name = "peak_memory_mb", nullable = false)
    private long peakMemoryMb;

    @Column(name = "cpu_usage_percent", nullable = false)
    private double cpuUsagePercent;

    @Column(name = "bytes_transferred", nullable = false)
    private long bytesTransferred;

    @Column(name = "compression_ratio", nullable = false)
    private double compressionRatio;

    @Column(name = "dedup_savings_percent", nullable = false)
    private double dedupSavingsPercent;

    @Column(name = "cost_estimate_usd", nullable = false)
    private double costEstimateUsd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BenchmarkStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at", nullable = false)
    private Instant finishedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getInitiatedBy() {
        return initiatedBy;
    }

    public void setInitiatedBy(UUID initiatedBy) {
        this.initiatedBy = initiatedBy;
    }

    public String getScenarioName() {
        return scenarioName;
    }

    public void setScenarioName(String scenarioName) {
        this.scenarioName = scenarioName;
    }

    public StrategyType getStrategyName() {
        return strategyName;
    }

    public void setStrategyName(StrategyType strategyName) {
        this.strategyName = strategyName;
    }

    public long getDatasetSizeBytes() {
        return datasetSizeBytes;
    }

    public void setDatasetSizeBytes(long datasetSizeBytes) {
        this.datasetSizeBytes = datasetSizeBytes;
    }

    public long getTransferTimeMs() {
        return transferTimeMs;
    }

    public void setTransferTimeMs(long transferTimeMs) {
        this.transferTimeMs = transferTimeMs;
    }

    public double getThroughputMbps() {
        return throughputMbps;
    }

    public void setThroughputMbps(double throughputMbps) {
        this.throughputMbps = throughputMbps;
    }

    public long getPeakMemoryMb() {
        return peakMemoryMb;
    }

    public void setPeakMemoryMb(long peakMemoryMb) {
        this.peakMemoryMb = peakMemoryMb;
    }

    public double getCpuUsagePercent() {
        return cpuUsagePercent;
    }

    public void setCpuUsagePercent(double cpuUsagePercent) {
        this.cpuUsagePercent = cpuUsagePercent;
    }

    public long getBytesTransferred() {
        return bytesTransferred;
    }

    public void setBytesTransferred(long bytesTransferred) {
        this.bytesTransferred = bytesTransferred;
    }

    public double getCompressionRatio() {
        return compressionRatio;
    }

    public void setCompressionRatio(double compressionRatio) {
        this.compressionRatio = compressionRatio;
    }

    public double getDedupSavingsPercent() {
        return dedupSavingsPercent;
    }

    public void setDedupSavingsPercent(double dedupSavingsPercent) {
        this.dedupSavingsPercent = dedupSavingsPercent;
    }

    public double getCostEstimateUsd() {
        return costEstimateUsd;
    }

    public void setCostEstimateUsd(double costEstimateUsd) {
        this.costEstimateUsd = costEstimateUsd;
    }

    public BenchmarkStatus getStatus() {
        return status;
    }

    public void setStatus(BenchmarkStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }
}