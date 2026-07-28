CREATE TABLE benchmark_runs (
    id UUID PRIMARY KEY,
    initiated_by UUID NOT NULL REFERENCES users(id),
    scenario_name VARCHAR(255) NOT NULL,
    strategy_name VARCHAR(32) NOT NULL,
    dataset_size_bytes BIGINT NOT NULL,
    transfer_time_ms BIGINT NOT NULL,
    throughput_mbps DOUBLE PRECISION NOT NULL,
    peak_memory_mb BIGINT NOT NULL,
    cpu_usage_percent DOUBLE PRECISION NOT NULL,
    bytes_transferred BIGINT NOT NULL,
    compression_ratio DOUBLE PRECISION NOT NULL,
    dedup_savings_percent DOUBLE PRECISION NOT NULL,
    cost_estimate_usd DOUBLE PRECISION NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_benchmark_strategy_started ON benchmark_runs(strategy_name, started_at DESC);
CREATE INDEX idx_benchmark_scenario ON benchmark_runs(scenario_name);
CREATE INDEX idx_benchmark_user_started ON benchmark_runs(initiated_by, started_at DESC);
