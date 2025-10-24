# Coretime Clicker Infrastructure Notes

This repository mostly tracks application code, but there are two key configuration files that live on the DigitalOcean droplet running the development node. Copies of both files live in `infra/` so they can be referenced or pushed again if the VM ever needs to be rebuilt.

## Host Overview

- **Provider:** DigitalOcean (basic droplet)
- **OS:** Ubuntu 22.04 LTS
- **Public endpoint:** `wss.juanerombado.info`
- **Services:**
  - `substrate-node.service` — runs `substrate-contracts-node` in `--dev` mode
  - `caddy.service` — HTTPS reverse proxy that terminates TLS and forwards WS traffic to the node

## Systemd service

The droplet uses a systemd unit at `/etc/systemd/system/substrate-node.service`. The exact content is stored in [`infra/substrate-node.service`](../infra/substrate-node.service) and reproduced below for convenience:

```ini
[Unit]
Description=Coretime Substrate Contracts Node
After=network.target
Wants=network-online.target

[Service]
User=coretime
ExecStart=/usr/local/bin/substrate-contracts-node \
    --dev \
    --rpc-cors all \
    --unsafe-rpc-external \
    --rpc-port 9933
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Useful commands:

```bash
sudo systemctl status substrate-node
sudo systemctl restart substrate-node
sudo journalctl -u substrate-node -f
```

The node exposes JSON-RPC (HTTP + WS) on port `9933`. Sanity check:

```bash
curl -s -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"rpc_methods"}' \
  http://127.0.0.1:9933
```

## Caddy reverse proxy

Caddy terminates TLS for `wss.juanerombado.info` and proxies to the node. The production config lives at `/etc/caddy/Caddyfile`; the version in this repo is [`infra/Caddyfile`](../infra/Caddyfile):

```caddy
wss.juanerombado.info {
    reverse_proxy http://127.0.0.1:9933 {
        transport http {
            versions h1.1
        }
        header_up Host {http.request.host}
    }
}
```

Reloading Caddy picks up config changes:

```bash
sudo systemctl reload caddy
sudo journalctl -u caddy -n 20 --no-pager
```

## DNS

`wss.juanerombado.info` is an `A` record pointing to the droplet’s public IPv4 address (`138.197.207.148`). Update the record at Namecheap (or NS provider) whenever the droplet IP changes.

## Deployment checklist

1. **Upload/instantiate contract** against `wss://wss.juanerombado.info` and note the address.
2. Update `frontend/.env.local` (or GitHub secret) with:
 - `VITE_RPC_ENDPOINT=wss://wss.juanerombado.info`
  - `VITE_CONTRACT_ADDRESS=<latest address>`
  - latest deployment (2025-10-24): `5DeDUaLbsxmkFdJQyYdXXuM8FFDJCaAHHpHTPuSeLbEyGw2V`
3. Smoke test locally with `npm run dev` and `npx wscat -c wss://wss.juanerombado.info`.
4. Push to GitHub to trigger the Pages workflow.

## Recovery notes

- If the droplet is rebuilt, copy the files from `infra/` back to `/etc/systemd/system/substrate-node.service` and `/etc/caddy/Caddyfile`, then run:

  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable --now substrate-node
  sudo systemctl reload caddy
  ```

- Install prerequisites again: `substrate-contracts-node` binary to `/usr/local/bin`, Caddy via package repository, and your SSH keys for the `coretime` user.

Documenting these details keeps the live environment reproducible and version-controlled alongside the code.
