# Contributing

Thanks for contributing to TriadFS.

## Development Standards

- Backend: Java 21 + Spring Boot 3
- Frontend: React + TypeScript + Tailwind
- Keep modules cohesive and APIs explicit
- Favor clarity and testability over clever abstractions

## Branching

- `main`: stable branch
- feature branches: `feat/<scope>-<short-name>`
- fixes: `fix/<scope>-<short-name>`

## Commit Style

Conventional Commit style is recommended:

- `feat: add parallel chunk transfer metrics`
- `fix: correct upload session chunk ordering`
- `docs: update benchmark methodology`

## Pull Request Checklist

- Problem statement and design summary
- Test evidence (`mvn test`, `npm run build`)
- API impact notes
- Screenshots for UI changes
- Migration notes for schema or config changes

## Local Setup

1. Start Postgres using `backend/infra/docker/docker-compose.yml`
2. Run backend API server
3. Run frontend dashboard

## Testing

- Unit tests: JUnit + Mockito
- Integration baseline: Testcontainers (Docker required)
- Frontend type/build checks via Vite + TypeScript