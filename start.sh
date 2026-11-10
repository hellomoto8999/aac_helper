#!/usr/bin/env bash
# Avvia (o riavvia) AAC Helper come servizio systemd (persistente al reboot).
set -euo pipefail

sudo systemctl restart aac-helper
sleep 2

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "AAC Helper avviato (servizio systemd: aac-helper)."
echo "URL: http://${IP:-localhost}:5173"
echo "Stato: systemctl status aac-helper"
