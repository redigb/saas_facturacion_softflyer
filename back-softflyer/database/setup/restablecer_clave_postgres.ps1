# Restablece la contrasena del usuario postgres en local. Ejecutar como Administrador:
#   powershell -ExecutionPolicy Bypass -File database\setup\restablecer_clave_postgres.ps1
param([Parameter(Mandatory = $true)][string]$NuevaClave)

$ErrorActionPreference = 'Stop'
$servicio = 'postgresql-x64-17'
$hba = 'C:\Program Files\PostgreSQL\17\data\pg_hba.conf'
$psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
$respaldo = "$hba.bak"

Copy-Item $hba $respaldo -Force
try {
    # 1. Permite entrar sin contrasena solo desde esta maquina, temporalmente.
    (Get-Content $hba) -replace '^(host\s+all\s+all\s+(127\.0\.0\.1/32|::1/128)\s+)scram-sha-256', '$1trust' | Set-Content $hba -Encoding ascii
    Restart-Service $servicio

    # 2. Fija la nueva contrasena.
    $sql = "ALTER USER postgres WITH PASSWORD '$($NuevaClave.Replace("'", "''"))';"
    & $psql -h 127.0.0.1 -U postgres -w -c $sql
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo cambiar la contrasena.' }
}
finally {
    # 3. Vuelve a exigir contrasena, pase lo que pase.
    Copy-Item $respaldo $hba -Force
    Restart-Service $servicio
}

Write-Host 'Contrasena de postgres restablecida. pg_hba.conf quedo como estaba.' -ForegroundColor Green
