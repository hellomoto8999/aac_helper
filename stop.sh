#!/usr/bin/env bash
# Ferma AAC Helper (servizio systemd).
set -euo pipefail

sudo systemctl stop aac-helper
echo "AAC Helper fermato."
