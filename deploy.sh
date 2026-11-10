#!/usr/bin/env bash
# Ricompila il frontend e riavvia il servizio (dopo modifiche al codice).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Build frontend"
cd "$ROOT/frontend"
npm run build

echo "==> Riavvio servizio"
sudo systemctl restart aac-helper
sleep 2

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Aggiornato. URL: http://${IP:-localhost}:5173"
