#!/usr/bin/env bash
set -euo pipefail

systemctl is-active --quiet memorynode-api
systemctl is-active --quiet memorynode-console
curl --fail --silent --show-error http://127.0.0.1:8000/health
curl --fail --silent --show-error --head http://127.0.0.1:3000/proposals/

echo "MemoryNode ECS runtime checks passed."
