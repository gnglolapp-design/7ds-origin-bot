$ErrorActionPreference = "Stop"
Write-Host "KV create (binding GAME_DATA) ..."
npx wrangler kv namespace create GAME_DATA --binding GAME_DATA --update-config --use-remote
Write-Host "KV create preview (binding GAME_DATA) ..."
npx wrangler kv namespace create GAME_DATA --preview --binding GAME_DATA --update-config --use-remote
Write-Host "OK: wrangler.toml mis à jour automatiquement."
