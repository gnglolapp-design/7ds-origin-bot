$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) {
@"
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
WORKER_URL=
"@ | Out-File -Encoding utf8 ".env"
}
@"
DISCORD_PUBLIC_KEY=
"@ | Out-File -Encoding utf8 ".dev.vars"
Write-Host "OK: .env (si absent) et .dev.vars créés."
