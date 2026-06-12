Write-Host "Starting TriadFS backend in dev mode..."
Push-Location "$PSScriptRoot/.."
try {
    mvn -pl api-server -am spring-boot:run -Dspring-boot.run.profiles=dev
} finally {
    Pop-Location
}