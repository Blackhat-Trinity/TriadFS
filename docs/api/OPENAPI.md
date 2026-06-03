# API Structure

Base path: `/api/v1`

Auth uses Bearer JWT.

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh` (placeholder)
- `GET /auth/me`

## File and Metadata

- `GET /files/tree`
- `POST /files/folders`
- `POST /files/init-upload`
- `DELETE /files/{fileId}` (soft delete)
- `POST /files/{fileId}/restore`
- `GET /files/{fileId}/versions`
- `GET /files/{fileId}/download?version={versionId}`

## Resumable Upload Sessions

- `POST /uploads/sessions`
- `GET /uploads/sessions/{sessionId}`
- `POST /uploads/sessions/{sessionId}/chunks/{chunkIndex}`
- `POST /uploads/sessions/{sessionId}/complete`
- `POST /uploads/sessions/{sessionId}/abort`

## Search

- `GET /search?query={prefix}`

## Transfer

- `GET /transfer/strategies`
- `POST /transfer/execute`
- `POST /transfer/estimate-cost`

## Benchmark

- `POST /benchmarks/runs`
- `GET /benchmarks/runs`
- `GET /benchmarks/runs/{runId}`
- `POST /benchmarks/compare`
- `GET /benchmarks/leaderboard`

## Settings

- `GET /settings/strategies`
- `PUT /settings/strategies/default`
- `GET /settings/security`
- `PUT /settings/security`

## Admin

- `GET /admin/audit-logs`
- `GET /admin/users`

## Envelope Contract

Success:

```json
{
  "data": {},
  "meta": {},
  "traceId": "...",
  "timestamp": "..."
}
```

Error:

```json
{
  "code": "BAD_REQUEST",
  "message": "...",
  "details": {},
  "traceId": "...",
  "timestamp": "..."
}
```

Swagger UI is available at `/swagger-ui/index.html` when backend is running.