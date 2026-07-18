# Alibaba Cloud ECS Deployment

This directory is deployment evidence for a single-instance MemoryNode runtime on Alibaba Cloud ECS. FastAPI, the governance console, SQLite, and FTS5 run on one ECS instance. Only Nginx is intended to receive public traffic.

## Runtime Boundary

```text
Reviewer browser
  -> Nginx public entry (Basic Auth)
     -> console 127.0.0.1:3000
     -> FastAPI /v1 127.0.0.1:8000
        -> SQLite + FTS5 on the ECS disk
        -> optional Qwen-compatible extraction endpoint over outbound HTTPS
```

`memorynode-api.service` and `memorynode-console.service` deliberately bind only to `127.0.0.1`. The SDK and MCP are API clients and never access SQLite directly. Do not expose ports `8000`, `3000`, or `8765` in an ECS security group.

The Qwen-compatible extraction integration is implemented in [`backend/app/qwen.py`](../../backend/app/qwen.py). Model responses are validated and create pending proposals only; a reviewer must approve or reject them through the governance console before an active memory is created.

## Install

On an Ubuntu Alibaba Cloud ECS instance, run the bootstrap script as `root`:

```bash
chmod 700 deploy/alibaba-cloud/ecs-bootstrap.sh
deploy/alibaba-cloud/ecs-bootstrap.sh
```

The script installs the fixed PyPI release, creates a non-login `memorynode` service account, initializes `/var/lib/memorynode`, and uses Alibaba Cloud's ECS VPC PyPI mirror. It neither starts public services nor writes model credentials.

Install the unit files and start the loopback-only processes:

```bash
install -m 644 deploy/alibaba-cloud/memorynode-api.service /etc/systemd/system/
install -m 644 deploy/alibaba-cloud/memorynode-console.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now memorynode-api memorynode-console
deploy/alibaba-cloud/verify-runtime.sh
```

## Public Entry Point

Before enabling `nginx-memorynode.conf`, obtain a TLS certificate for a filed domain and replace `__SERVER_NAME__` and `__PUBLIC_ORIGIN__` with the same `https://` origin. The template redirects HTTP to HTTPS and never serves Basic Auth over plaintext HTTP. Create a reviewer password file before enabling it:

```bash
apt-get install -y apache2-utils
htpasswd -c /etc/nginx/.memorynode.htpasswd reviewer
```

The Nginx template leaves `/health` public as deployment evidence and protects the governance console and `/v1` API with Basic Auth. Configure the ECS security group with public `80`/`443` only; restrict SSH `22` to trusted source addresses.

For a China mainland ECS instance, bind a domain and enable HTTPS only after the applicable ICP filing is complete. Do not use an unfiled domain as the public submission endpoint.

## Verification

Run `verify-runtime.sh` on the instance, then verify from an external network:

```bash
curl --fail --silent --show-error https://__SERVER_NAME__/health
```

Take deployment screenshots without exposing instance IDs, account identifiers, source data, database files, HTTP credentials, or model API keys.
