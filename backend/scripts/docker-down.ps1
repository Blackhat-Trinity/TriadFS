param(
  [switch]$WithVolumes
)

Push-Location "$PSScriptRoot/../infra/docker"
try {
  if ($WithVolumes) {
    docker compose down -v
  } else {
    docker compose down
  }
} finally {
  Pop-Location
}