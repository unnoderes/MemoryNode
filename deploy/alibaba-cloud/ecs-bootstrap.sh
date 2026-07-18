#!/usr/bin/env bash
set -euo pipefail

# Run as root on an Ubuntu Alibaba Cloud ECS instance before installing the units.
readonly APP_USER="memorynode"
readonly APP_HOME="/opt/memorynode"
readonly DATA_HOME="/var/lib/memorynode"
readonly VERSION="${MEMORYNODE_VERSION:-0.8.1}"
readonly INDEX_URL="http://mirrors.cloud.aliyuncs.com/pypi/simple/"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl nginx python3-venv

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --system --group --home "${APP_HOME}" --shell /usr/sbin/nologin "${APP_USER}"
fi

install -d -m 700 -o "${APP_USER}" -g "${APP_USER}" "${DATA_HOME}"

if [[ ! -x "${APP_HOME}/venv/bin/python" ]]; then
  sudo -u "${APP_USER}" -H python3 -m venv "${APP_HOME}/venv"
fi

sudo -u "${APP_USER}" -H "${APP_HOME}/venv/bin/pip" install \
  --timeout 120 \
  --retries 5 \
  --index-url "${INDEX_URL}" \
  --trusted-host mirrors.cloud.aliyuncs.com \
  "memorynode==${VERSION}"

sudo -u "${APP_USER}" -H env MEMORYNODE_HOME="${DATA_HOME}" \
  "${APP_HOME}/venv/bin/memorynode" init

echo "MemoryNode ${VERSION} is installed. Install the systemd units before starting services."
