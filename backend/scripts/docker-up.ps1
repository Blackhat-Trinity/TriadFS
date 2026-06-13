param(
  [switch]$WithTools
)

Push-Location "$PSScriptRoot/../infra/docker"
try {
  if (-not (Test-Path .env)) {
    Copy-Item .env.example .env -Force
  }

  if ($WithTools) {
    docker compose --profile tools up -d --build
  } else {
    docker compose up -d --build
  }
} finally {
  Pop-Location
}