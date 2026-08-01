package com.triadfs.benchmark.metrics;

import org.springframework.stereotype.Service;

@Service
public class CostModelService {
    public double estimateUsd(long bytesTransferred, long durationMs, double cpuUsagePercent) {
        double network = (bytesTransferred / 1_000_000_000d) * 0.08d;
        double compute = (durationMs / 1000d / 3600d) * 0.04d * Math.max(0.1d, cpuUsagePercent / 100d);
        double storage = (bytesTransferred / 1_000_000_000d) * 0.02d;
        return round(network + compute + storage);
    }

    private double round(double value) {
        return Math.round(value * 10_000d) / 10_000d;
    }
}