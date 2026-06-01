# TriadFS Architecture

## Design Goals

TriadFS is designed for controlled experiments around the transfer tradeoff triangle:

1. Speed (throughput / transfer latency)
2. Memory footprint during transfer
3. Cost (network, storage, compute)

The architecture intentionally keeps transfer strategy logic isolated, benchmarkable, and switchable at runtime.

## Layered Topology

- Frontend dashboard (`frontend`): visualization, transfer control, benchmark orchestration UI.
- API layer (`backend/api-server`): REST endpoints, validation, OpenAPI docs, error envelopes.
- Domain engines (`metadata-service`, `storage-engine`, `transfer-engine`, `benchmark-engine`, `auth-module`).
- Persistence: PostgreSQL for server/dev mode, H2 for standalone desktop mode, plus chunk store for payload bytes.

## Backend Module Responsibilities

### `auth-module`
- JWT issue/parse.
- Spring Security filter chain.
- Role-based baseline controls.

### `metadata-service`
- File tree and version metadata.
- Upload session state for resumable transfer.
- Audit logs and benchmark run persistence.
- Prefix search using trie.

### `storage-engine`
- File chunking.
- SHA-256 hashing.
- Dedup detection via hash catalog.
- Chunk reconstruction and LRU cache for hot chunk reads.

### `transfer-engine`
- Strategy pattern implementations:
  - Whole file
  - Streaming
  - Sequential chunk
  - Parallel chunk
  - Compressed
  - Encrypted
- Runtime strategy factory.
- Resumable chunk buffer assembly.

### `benchmark-engine`
- Benchmark run execution over strategy sets.
- Metric capture and persistence.
- Leaderboard and comparison-oriented outputs.

## Core Patterns and CS Fundamentals

### DSA
- Tree model for file hierarchy (`file_nodes.parent_id`).
- Hash map indexing (chunk hash lookup and in-memory buffers).
- LRU cache for chunk payload reuse.
- Trie for prefix search in metadata service.

### OOP
- Strategy pattern (`TransferStrategy` + concrete strategies).
- Factory pattern (`TransferStrategyFactory`).
- Modular service boundaries and single-responsibility classes.

### Concurrency / OS
- Parallel chunk strategy uses thread pools to prepare chunk work.
- Session chunk buffers are thread-safe (`ConcurrentSkipListMap`, `ConcurrentHashMap`).
- Streaming/chunking strategy differences expose speed-memory tradeoffs.

### DBMS
- Flyway-managed schema migration.
- Normalized tables for users/roles/files/chunks/versions/sessions/benchmarks.
- Indexes for file traversal, chunk lookup, benchmark querying.

### Networks
- Chunk upload endpoints.
- Session-based resumable uploads with expected chunk index tracking.
- Strategy benchmarking across different transfer modes.

### Security
- Password hashing via BCrypt.
- JWT bearer auth.
- Optional encrypted transfer mode (AES-GCM).
- Checksum and content hash tracking.

## Runtime Flow

1. Client authenticates and receives JWT.
2. Client creates file/upload session with selected strategy.
3. Payload is chunked and processed by transfer strategy.
4. Storage engine hashes chunks and deduplicates on hash index.
5. Metadata service writes file version + version/chunk mapping.
6. Benchmark engine records speed/memory/cost metrics.
7. Dashboard visualizes ranked comparisons.

## Deployment Modes

### Server / Development Mode

- API Server: stateless Spring Boot process.
- Database: PostgreSQL.
- Operations: usually local Docker or remote infrastructure.
- Purpose: full backend realism, multi-user/server-style deployments.

### Standalone Desktop Mode

- Electron starts the bundled Spring Boot API automatically on localhost.
- Packaged builds bundle:
  - backend fat jar
  - native Java runtime from the build machine
  - desktop database profile using an embedded H2 file store
- The frontend authenticates against the local API automatically using a desktop bootstrap user.
- Local data lives under the app user-data directory instead of Docker volumes.
- Purpose: shareable install-and-run desktop application without Docker.

## Deployment Baseline

- API Server: stateless Spring Boot process.
- PostgreSQL: persistent metadata and benchmark store in server/dev mode.
- H2 file database: standalone desktop persistence.
- Chunk storage: local filesystem path in dev, object storage in production-compatible design.
