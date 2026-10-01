# Justin — portfolio and writing

A Go API and React front end for projects, experience, articles, comments, friend links, contact messages, and a private editorial workspace. The public site is a Vite-built SPA with route-level code splitting, Tailwind CSS, and shadcn/ui controls. Go serves the built app, APIs, images, robots.txt, and sitemaps; Python is not required.

## Run locally

Requires Go 1.25.4+ and a Node.js version supported by Vite 8 (Node 20.19+ or 22.12+).

```sh
npm --prefix web ci
npm --prefix web run build
SECRET_KEY='replace-with-at-least-32-random-characters' go run ./cmd/blog
```

Open <http://localhost:8080>. The Go server reads `.env` when present; environment variables take precedence. It expects an existing SQLite database at `instance/blog.db` by default and creates missing tables only. `DATABASE_URL=sqlite:///blog.db` also selects `instance/blog.db` for compatibility with the previous Flask configuration; other `DATABASE_URL` values are treated as filesystem paths. **Back up the database before deploying or migrating it.** Do not commit `.env`, database copies, or visitor contact details.

For hot reload, run `npm --prefix web run dev` alongside Go. Vite proxies `/api` and `/static` to port 8080; use port 5173 for the React UI.

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Required session-signing secret; generate at least 32 unpredictable characters. Replace any example value before production. |
| `DATABASE_URL` | SQLite database path; defaults to `instance/blog.db`. |
| `PORT` | HTTP port; defaults to `8080`. Used when `LISTEN_ADDR` is unset. |
| `LISTEN_ADDR` | Optional full `host:port` listener address, for example `127.0.0.1:8080`; overrides `PORT`. |
| `GIN_MODE` | Set `release` for production; session cookies are then marked Secure, so deploy behind HTTPS. |
| `VITE_API_BASE_URL` | Frontend build-time Go API origin only (scheme and host, no path); leave unset for relative API calls through the local Vite proxy or same-origin hosting. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact frontend origins allowed to call the API with credentials; omit paths and trailing slashes. `*` is never accepted. |
| `SESSION_COOKIE_SAME_SITE` | Session cookie policy: `Strict` by default, or `Lax`; `None` is allowed only when Secure cookies are enabled (`GIN_MODE=release`). |
| `SITE_URL` | Absolute canonical site URL for article sitemaps; defaults to `https://justin0711.com`. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | Optional Cloudflare Turnstile credentials; set both or neither. With both set, contact/comment forms require verified tokens. |
| `REDIS_URL` | Optional Redis URL (for example `redis://127.0.0.1:6379/0`) for public GET response caching. When unset or unavailable, reads use SQLite. |
| `REDIS_PREFIX` | Redis application namespace; defaults to `justin`. |
| `PUBLIC_CACHE_TTL` | Public API cache duration as a Go duration; defaults to `60s`. Set `0s` to disable caching. |

## Split frontend and API origins

The production SPA is hosted at `https://justin0711.com` on Cloudflare Pages. The Go API and static media use `https://bh.justin0711.com`; Caddy terminates public HTTPS and proxies to the Go process on loopback port `5004`.

In the Cloudflare Pages project, set the custom domain to `justin0711.com`, the root directory to `web`, the build command to `npm run build`, and the output directory to `dist`. `web/.env.production` sets the public build-time API origin to:

```text
VITE_API_BASE_URL=https://bh.justin0711.com
```

If configuring this value in Pages settings instead, use the same exact value for the production environment. The variable contains no secret. Local development leaves it unset so Vite continues proxying `/api` and `/static` to Go.

Configure the Go service with:

```dotenv
GIN_MODE=release
LISTEN_ADDR=127.0.0.1:5004
SITE_URL=https://justin0711.com
CORS_ALLOWED_ORIGINS=https://justin0711.com
SESSION_COOKIE_SAME_SITE=Strict
```

`LISTEN_ADDR` is the private Go listener, not the browser-facing API URL. Caddy serves `https://bh.justin0711.com` on the normal HTTPS port and forwards requests to `127.0.0.1:5004`; do not expose port `5004` to the public Internet. CORS must allow the exact frontend origin `https://justin0711.com` (no path or trailing slash). The API returns credentialed CORS headers only for configured origins and permits only the methods and `Content-Type` header used by this SPA. Keep HTTPS enabled: release mode marks the HttpOnly, host-only session cookie Secure, and frontend API fetches send credentials.

The frontend and API are different origins but subdomains of the same site, so `SESSION_COOKIE_SAME_SITE=Strict` is appropriate and the session cookie remains host-only on the API hostname. The frontend's shared image URL helper requests project, profile, and Markdown media from the API origin under `/static`; external absolute image URLs remain unchanged.

In Cloudflare DNS, point `justin0711.com` to the Pages project and `bh.justin0711.com` to the VPS/Caddy host. Ensure Caddy can obtain/renew a certificate for `bh.justin0711.com`. If Cloudflare proxying is enabled, public requests use HTTPS on port 443; port `5004` stays private between Caddy and Go.

Public page-view totals count raw public SPA pathname transitions, not unique people. Totals are stored by UTC day and for the lifetime of the site; no visitor identifiers are stored for this feature. `/blog/random` itself is not counted—the destination article is.

Preserve the `static/images` tree and configure Go's runtime assets with the release. `SITE_URL` and the canonical public frontend domain are `https://justin0711.com`; update `robots.txt` if the canonical frontend domain changes.

## Production deployment: Ubuntu LTS ARM64 VPS

This procedure targets the requested Linux ARM64 VPS. Caddy terminates HTTPS for `bh.justin0711.com`, Go listens only on loopback at `127.0.0.1:5004`, SQLite remains the source of truth, and Redis is an optional local cache. The frontend is hosted separately by Cloudflare Pages at `https://justin0711.com`. Replace only the release identifier and source checkout details with your deployment values. Install supported Go and Node.js releases matching the versions above; Ubuntu's default Go package may be too old.

### 1. Install services and prepare persistent state

Install Caddy from its official stable apt repository, plus Redis, SQLite utilities, and a dedicated unprivileged service account. Do not expose the Go or Redis ports through the firewall.

```sh
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy redis-server sqlite3
sudo adduser --system --group --home /var/lib/justin --no-create-home --shell /usr/sbin/nologin justin
sudo install -d -o root -g root -m 0755 /opt/justin/releases
sudo install -d -o justin -g justin -m 0750 /var/lib/justin/static/images
sudo install -d -o root -g root -m 0700 /var/backups/justin
```

Keep the production database outside the release directory at `/var/lib/justin/blog.db`. On first setup, install an existing SQLite database there if there is one; this application creates missing tables but does not initialize content or migrate your data set for you. If you are moving an existing deployment, copy its `static/images` tree into `/var/lib/justin/static/images` before switching releases. For each release, point that release's `static/images` path at the persistent directory so upgrades never replace uploaded media:

```sh
rm -rf static/images
ln -s /var/lib/justin/static/images static/images
```

The removal above is only for the disposable release checkout after any existing media has been copied to the persistent directory. Never run it against `/var/lib/justin/static/images`.

### 2. Build an immutable release

Check out the source into a new versioned directory under `/opt/justin/releases` (do not build over the active release), then build the frontend and Go server from that directory:

```sh
cd /opt/justin/releases/<release-id>
npm --prefix web ci
npm --prefix web run build
mkdir -p bin
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o bin/blog ./cmd/blog
```

Use a release identifier such as a commit SHA or UTC timestamp. Ensure the runtime user can read the release and execute `bin/blog`, but cannot modify application code. Keep `web/dist` and the other runtime assets in the release; the persistent SQLite file and image directory stay outside it.

### 3. Protect production configuration

Create `/etc/justin/blog.env` with `sudoedit` and set it to root ownership and mode `0600`. systemd reads this file as root and passes the values to the service. Never put live secrets in the release, shell history, or this README.

```dotenv
SECRET_KEY=<at-least-32-random-characters-from-a-cryptographic-generator>
DATABASE_URL=/var/lib/justin/blog.db
SITE_URL=https://justin0711.com
GIN_MODE=release
LISTEN_ADDR=127.0.0.1:5004
CORS_ALLOWED_ORIGINS=https://justin0711.com
SESSION_COOKIE_SAME_SITE=Strict
REDIS_URL=redis://127.0.0.1:6379/0
REDIS_PREFIX=justin
PUBLIC_CACHE_TTL=60s
TURNSTILE_SITE_KEY=<production-site-key>
TURNSTILE_SECRET=<production-secret>
```

Generate `SECRET_KEY` with a cryptographically secure source such as `openssl rand -hex 32`; preserve your existing production secret and database path when updating configuration. Use the exact public frontend URL for `SITE_URL`. `CORS_ALLOWED_ORIGINS` must be the exact Pages origin `https://justin0711.com`. Configure the production Turnstile site for `justin0711.com` and its secret, or omit both Turnstile variables to disable the integration. `GIN_MODE=release` enables Secure session cookies; HTTPS must be active at Caddy before production logins are used. `LISTEN_ADDR=127.0.0.1:5004` binds Go privately for Caddy; do not open port `5004` in the VPS firewall.

```sh
sudo chown root:root /etc/justin/blog.env
sudo chmod 0600 /etc/justin/blog.env
```

### 4. Run Go with systemd

Create `/etc/systemd/system/justin.service` (root-owned, mode `0644`) and substitute the release path after the initial build:

```ini
[Unit]
Description=Justin portfolio web application
After=network.target redis-server.service
Wants=redis-server.service

[Service]
Type=simple
User=justin
Group=justin
WorkingDirectory=/opt/justin/current
EnvironmentFile=/etc/justin/blog.env
ExecStart=/opt/justin/current/bin/blog
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/justin

[Install]
WantedBy=multi-user.target
```

Activate the first release and start the service:

```sh
sudo ln -sfnT /opt/justin/releases/<release-id> /opt/justin/current
sudo systemctl daemon-reload
sudo systemctl enable --now justin
sudo systemctl status justin
```

The service account needs read/execute access to `/opt/justin/current` and write access only to `/var/lib/justin`. Keep the environment file root-owned; do not make it readable by the application account.

### 5. Keep Redis private

Redis is an optimization only; the SQLite database remains authoritative. Configure the local Redis server to listen only on loopback (`bind 127.0.0.1 ::1`) with `protected-mode yes`, then restart it and verify it is not listening on a public interface:

```sh
sudo systemctl enable --now redis-server
sudo ss -ltnp | grep 6379
```

Use a local `REDIS_URL` such as `redis://127.0.0.1:6379/0`. Do not open port 6379 in UFW or a cloud firewall. If Redis requires authentication, use a suitably protected Redis URL in `/etc/justin/blog.env`; do not put credentials in a command line or source file. The app uses bounded Redis operation timeouts and falls back to SQLite if Redis is unset or unavailable. Failed invalidation may leave a public response stale only until the configured short cache TTL expires.

### 6. Configure Caddy and the firewall

Set `/etc/caddy/Caddyfile` to your hostname. Caddy obtains and renews certificates automatically when DNS points to the VPS and inbound HTTP/HTTPS are reachable.

```caddy
bh.justin0711.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:5004
}
```

Validate and reload Caddy:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Allow SSH and the public web ports only; keep Go port 5004 and Redis port 6379 private:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Apply equivalent rules in the VPS provider's firewall/security group. Point `bh.justin0711.com` DNS to this host; point the apex `justin0711.com` to the Cloudflare Pages project. `SITE_URL` is the frontend URL, while the Caddy hostname is the API hostname. Configure Turnstile for the frontend domain.

### Backups and restore

Back up SQLite using its online backup command (rather than copying a live database file while SQLite may be writing), and archive the persistent media separately. Keep backups encrypted and off-host as well as access-controlled locally.

```sh
sudo sqlite3 /var/lib/justin/blog.db ".backup '/var/backups/justin/blog-YYYYMMDD-HHMMSS.db'"
sudo tar -czf /var/backups/justin/images-YYYYMMDD-HHMMSS.tar.gz -C /var/lib/justin/static images
```

For a restore, stop the service first, restore the database and image archive, then restore ownership and start the service. Verify the backup paths before running copy/extract commands; restoring replaces the current database contents and media.

```sh
sudo systemctl stop justin
sudo cp /var/backups/justin/<database-backup>.db /var/lib/justin/blog.db
sudo tar -xzf /var/backups/justin/<images-backup>.tar.gz -C /var/lib/justin/static
sudo chown -R justin:justin /var/lib/justin
sudo systemctl start justin
```

### Upgrade, rollback, and smoke checks

Build every upgrade in a new release directory before activation. Take a fresh SQLite and media backup, create the release's `static/images` symlink, and then switch the `current` symlink and restart. Keep the previous release available until smoke checks pass.

```sh
sudo ln -sfnT /opt/justin/releases/<new-release-id> /opt/justin/current
sudo systemctl restart justin
sudo systemctl --no-pager --full status justin
curl --fail --silent --show-error http://127.0.0.1:5004/api/config
curl --fail --silent --show-error https://bh.justin0711.com/api/home
curl --fail --silent --show-error https://justin0711.com
```

Check Caddy's HTTPS certificate and the public SPA in a browser. If the new release fails, point `current` back to the prior release and restart:

```sh
sudo ln -sfnT /opt/justin/releases/<previous-release-id> /opt/justin/current
sudo systemctl restart justin
sudo journalctl -u justin -n 100 --no-pager
```

Do not restore an older database automatically during a code rollback: doing so discards writes made since the backup. Restore a database only when required for compatibility, after explicitly accounting for those intervening writes. This application does not add destructive migrations as part of this deployment procedure.

Useful diagnostics are `sudo journalctl -u justin -f`, `sudo journalctl -u caddy -f`, `sudo systemctl status redis-server`, and a loopback request to `/api/home`. If Redis is down, the service should still start and public API reads should continue from SQLite; investigate Redis separately without treating its cache contents as source data.

