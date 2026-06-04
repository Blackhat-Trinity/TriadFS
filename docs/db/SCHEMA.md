# Database Schema

TriadFS uses PostgreSQL with Flyway migrations located in:

- `backend/api-server/src/main/resources/db/migration`

## Tables

- `users`
- `roles`
- `user_roles`
- `file_nodes`
- `file_versions`
- `chunks`
- `version_chunks`
- `permissions`
- `upload_sessions`
- `audit_logs`
- `benchmark_runs`

## Important Relationships

- `file_nodes.parent_id -> file_nodes.id` (tree)
- `file_versions.file_node_id -> file_nodes.id`
- `version_chunks.version_id -> file_versions.id`
- `version_chunks.chunk_id -> chunks.id`
- `upload_sessions.file_node_id -> file_nodes.id`
- `benchmark_runs.initiated_by -> users.id`

## Index Highlights

- File traversal: `idx_file_nodes_parent_name`, `idx_file_nodes_owner_deleted`
- Dedup lookup: unique `chunks.sha256_hash`
- Benchmarks: `idx_benchmark_strategy_started`, `idx_benchmark_user_started`
- Upload tracking: `idx_upload_sessions_user_status`

## Migration Sequence

1. `V1__core_identity_and_roles.sql`
2. `V2__file_tree_and_versioning.sql`
3. `V3__chunk_and_dedup.sql`
4. `V4__upload_sessions_and_audit.sql`
5. `V5__benchmark_runs.sql`