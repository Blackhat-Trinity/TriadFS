# Backend Docker Stack

## Start API + Postgres

```powershell
cd backend/infra/docker
Copy-Item .env.example .env -Force
docker compose up -d --build
```

## Optional Tools Profile (pgAdmin)

```powershell
docker compose --profile tools up -d
```

## Stop

```powershell
docker compose down
```

## Stop + remove volumes

```powershell
docker compose down -v
```

## URLs

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui/index.html`
- Health: `http://localhost:8080/actuator/health`
- pgAdmin (tools profile): `http://localhost:5050`