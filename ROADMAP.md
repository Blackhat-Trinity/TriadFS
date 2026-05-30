# Roadmap

## Completed (Current Baseline)

- Multi-module backend skeleton with Java 21 + Spring Boot 3
- Flyway migrations and normalized DB schema
- Chunk storage/dedup engine baseline
- Transfer strategy framework with six strategies
- Benchmark run engine and ranking APIs
- JWT auth and RBAC baseline
- React analytics dashboard with required pages and charts
- Unit tests and Testcontainers integration baseline
- Standalone desktop distribution path with bundled backend/runtime and embedded desktop DB profile

## Next Iterations

1. Harden resumable upload protocol with chunk checksum verification.
2. Add object storage adapters (S3/MinIO) with tiered cost modeling.
3. Improve benchmark realism (network shaping, file profile suites).
4. Add background job orchestration for long benchmark runs.
5. Add CLI client for automation and CI benchmark pipelines.
6. Add observability stack (Prometheus/Grafana dashboards).
7. Expand security features (key management, rotation, fine-grained ACL editor).
8. Add native per-OS release validation on macOS and Linux hosts.
