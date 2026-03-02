# 7DS Origins Discord Bot (Cloudflare Workers + KV)

## Quickstart
1) npm i
2) npx playwright install chromium
3) npx wrangler login
4) .\scripts\new-env.ps1 (fill .env)
5) .\scripts\provision-kv.ps1
6) node .\scripts\sync-all.mjs
7) npx wrangler kv bulk put .\data\compiled\kv-bulk.json --binding GAME_DATA
8) npx wrangler deploy
9) set endpoint URL to /interactions
10) node .\scripts\register-commands.mjs
