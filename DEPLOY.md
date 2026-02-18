# Production Deployment

## Prerequisites

- Docker and Docker Compose v2.24+
- A reverse proxy handling TLS (Caddy or Nginx Proxy Manager)
- A dedicated system user with UID 1001 in group 100
- A shared Docker network named `proxy`

## User IDs

| Environment | UID:GID   |
|-------------|-----------|
| Development | 1000:100  |
| Production  | 1001:100  |

Development uses 1000:100 (set in `compose.yaml` and used directly on the host). Production uses 1001:100 (overridden in `compose.production.yaml` and `Dockerfile`).

## Directory Setup

Create the data directories owned by the production user:

```sh
sudo mkdir -p /opt/moodtune/data/redis /opt/moodtune/data/minio
sudo chown -R 1001:100 /opt/moodtune/data
```

## Docker Network

Create the shared proxy network (one-time):

```sh
docker network create proxy
```

The moodtune app joins this network so the reverse proxy can reach it. The reverse proxy must also join this network (see the Caddy or NPM sections below).

## Secrets

Copy the template and generate secrets:

```sh
cp env-template.production .env
```

Generate each value and fill in `.env`:

```sh
# REDIS_PASSWORD
openssl rand -base64 32

# MINIO_ACCESS_KEY
openssl rand -hex 16

# MINIO_SECRET_KEY
openssl rand -base64 32

# JWT_SECRET
openssl rand -base64 48

# ADMIN_PASSWORD
openssl rand -base64 24
```

## Build

```sh
docker compose -f compose.yaml -f compose.production.yaml build
```

To use a private npm registry:

```sh
NPM_CONFIG_REGISTRY=https://your-registry.example.com \
  docker compose -f compose.yaml -f compose.production.yaml build
```

## Start

```sh
docker compose -f compose.yaml -f compose.production.yaml up -d
```

## Seed (first run only)

After the services are healthy, run the seed to create the admin user and MinIO buckets:

```sh
docker compose -f compose.yaml -f compose.production.yaml --profile seed run --rm seed
```

## Health Checks

```sh
docker compose -f compose.yaml -f compose.production.yaml ps
```

All three services (app, redis, minio) report health status. The app healthcheck hits `http://localhost:3000/` internally.

## Logs

```sh
docker compose -f compose.yaml -f compose.production.yaml logs -f app
docker compose -f compose.yaml -f compose.production.yaml logs -f redis
docker compose -f compose.yaml -f compose.production.yaml logs -f minio
```

## Stop

```sh
docker compose -f compose.yaml -f compose.production.yaml down
```

## Network Isolation

Production uses two networks:

- **`proxy`** (external) — shared with the reverse proxy, the app is reachable here
- **`backend`** (internal) — Redis and MinIO only, no host port bindings

```
reverse proxy ──> proxy network ──> app ──> backend network ──> redis
                                                             ──> minio
```

## Security Hardening

- **Redis**: password-protected (`--requirepass`), 256 MB maxmemory with noeviction, `FLUSHALL`/`FLUSHDB`/`DEBUG` commands disabled
- **MinIO**: no host ports, no console access
- **App**: read-only filesystem (`tmpfs /tmp` for ffmpeg temp files), 2 CPU / 1 GB RAM limits
- **All services**: `no-new-privileges` security option, run as 1001:100
- **Rate limiting**: login endpoint (`POST /`) limited to 20 attempts per 15 minutes per IP, returns 429 with `Retry-After: 900`

## CSP Notes

These apply to both reverse proxy options below:

- `'unsafe-inline'` is required for `script-src` and `style-src` because Emotion (MUI's CSS-in-JS engine) injects styles and scripts at runtime
- `media-src 'self' blob:` allows audio playback via the streaming API and blob URLs
- `frame-ancestors 'none'` prevents the app from being embedded in iframes

## Reverse Proxy: Caddy

Add the `proxy` network to your Caddy compose file:

```yaml
services:
  caddy:
    networks:
      - default
      - proxy

networks:
  proxy:
    external: true
```

Add this site block to your Caddyfile:

```caddyfile
moodtune.example.com {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    -Server
  }

  @blocked path /wp-admin* /wp-login* /wp-content* /xmlrpc.php /.env /.git* /phpmyadmin* /cgi-bin*
  respond @blocked 403

  @bad_agents header_regexp User-Agent "(?i)(sqlmap|nikto|nmap|masscan|zgrab|gobuster|dirbuster|wfuzz|nuclei)"
  respond @bad_agents 403

  log {
    output file /var/log/caddy/moodtune-access.log {
      roll_size 50MiB
      roll_keep 10
      roll_keep_for 90d
    }
    format json
  }

  reverse_proxy moodtune-app-1:3000
}
```

Replace `moodtune.example.com` with your actual domain.

## Reverse Proxy: Nginx Proxy Manager

Add the `proxy` network to your NPM compose file:

```yaml
services:
  hydra:
    networks:
      - default
      - proxy

networks:
  proxy:
    external: true
```

Configure the proxy host through the NPM admin UI (port 81).

### Proxy Host

| Field                | Value                    |
|----------------------|--------------------------|
| Domain Names         | moodtune.example.com     |
| Scheme               | http                     |
| Forward Hostname/IP  | moodtune-app-1           |
| Forward Port         | 3000                     |
| Websockets Support   | off                      |

The forward hostname `moodtune-app-1` is the Docker container name (compose project `moodtune` + service `app` + replica `1`). Both the proxy and the app must be on the `proxy` network for this to resolve.

### SSL Tab

- Request a new SSL certificate via Let's Encrypt
- Enable Force SSL
- Enable HSTS and HSTS Subdomains

### Advanced Tab

Paste the following into the Custom Nginx Configuration box:

```nginx
# Security headers
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Block common exploit paths
location ~* ^/(wp-admin|wp-login|wp-content|xmlrpc\.php|\.env|\.git|phpmyadmin|cgi-bin) {
    return 403;
}
```

## Architecture Overview

```
               ┌──────────────────────────────────────────────────┐
               │                 Docker Host                      │
               │                                                  │
  HTTPS ──────>│  reverse proxy ──> [proxy network] ──> app:3000  │
               │   :80 :443                              │        │
               │                               [backend network]  │
               │                                 │          │     │
               │                              redis:6379  minio   │
               │                                 │          │     │
               │                              data/redis  data/   │
               │                                          minio   │
               └──────────────────────────────────────────────────┘
```
