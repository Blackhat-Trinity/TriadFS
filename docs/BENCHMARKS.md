# Benchmark Methodology

TriadFS benchmarks are intended to compare transfer strategies under controlled scenarios.

## Metrics Captured Per Run

- `transfer_time_ms`
- `throughput_mbps`
- `peak_memory_mb`
- `cpu_usage_percent` (approx process load)
- `bytes_transferred`
- `compression_ratio`
- `dedup_savings_percent`
- `cost_estimate_usd`

## Scenario Inputs

- Strategy list
- Chunk size
- Payload size
- Iteration count
- Scenario name

## Baseline Cost Model

Estimated run cost is calculated as:

- Network: transferred GB * 0.08 USD
- Compute: runtime hours * CPU factor * 0.04 USD
- Storage: transferred GB * 0.02 USD

This is intentionally simple and replaceable by environment-specific models.

## Reproducibility

To keep experiments reproducible:

- Store scenario name and strategy in `benchmark_runs`.
- Persist all metric outputs in database.
- Keep chunking and strategy config explicit in run request payload.

## Example Comparison

| Strategy | Throughput (Mbps) | Peak Memory (MB) | Dedup Savings (%) | Cost (USD) |
|---|---:|---:|---:|---:|
| PARALLEL_CHUNK | 950 | 384 | 18 | 0.2100 |
| COMPRESSED | 710 | 310 | 11 | 0.1600 |
| STREAMING | 592 | 170 | 8 | 0.2400 |

## API Endpoints

- `POST /api/v1/benchmarks/runs`
- `GET /api/v1/benchmarks/runs`
- `GET /api/v1/benchmarks/runs/{runId}`
- `POST /api/v1/benchmarks/compare`
- `GET /api/v1/benchmarks/leaderboard`