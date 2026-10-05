# Production deployment setup

The deployment workflow is `.github/workflows/deploy.yml`. It copies the
application to `/opt/nextjs-app`, runs `npm ci`, generates Prisma Client,
runs `prisma migrate deploy`, builds the app, and restarts the `nextjs`
systemd service. It does not use Git pull, PM2, or a configurable app-path
secret.

## 1. Prepare the droplet

Install Node.js 22 and create the deployment directory. Use the same Linux
account configured as `DO_USERNAME` in GitHub Actions:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo mkdir -p /opt/nextjs-app
sudo chown -R "$USER":"$USER" /opt/nextjs-app
```

Configure the reverse proxy and TLS to send requests to `127.0.0.1:3000`.
The workflow does not configure the proxy or firewall.

## 2. Install the systemd service and production environment

Create `/opt/nextjs-app/.env` on the droplet. The SCP step copies selected
source files only; `.env` is deliberately not copied from GitHub and must
remain on the server across deployments. Put the production values there,
including `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`NEXT_PUBLIC_APP_URL`, mail/upload/Turnstile settings, and `CRON_SECRET`.
Do not put local development URLs in this file. Restrict its permissions:

```bash
chmod 600 /opt/nextjs-app/.env
```

Create `/etc/systemd/system/nextjs.service`, replacing `deploy` with the
Linux account used by GitHub Actions:

```ini
[Unit]
Description=Next.js blog application
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/nextjs-app
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/nextjs-app/.env
ExecStart=/usr/bin/node /opt/nextjs-app/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable the service before the first workflow deployment:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nextjs
```

The workflow restarts this service after each successful remote build and
checks that it is active.

## 3. Mark the existing database baseline

The baseline migration is `20261002000000_baseline`. If production already
has the schema (for example, it was created with `prisma db push`), run this
once on the droplet after the workflow has copied the baseline migration and
before the first deployment that runs `prisma migrate deploy`:

```bash
cd /opt/nextjs-app
npx prisma migrate resolve --applied 20261002000000_baseline
```

This records the existing schema without executing the baseline's table
creation SQL. Do not run `migrate deploy` against that database before
resolving the baseline. For a genuinely empty database, do not mark it
applied; `migrate deploy` should create the schema from the baseline.

## 4. Add GitHub Actions secrets

In **Settings → Secrets and variables → Actions**, add:

| Name | Value |
| --- | --- |
| `DO_HOST` | Droplet IP address or hostname |
| `DO_USERNAME` | SSH account that owns `/opt/nextjs-app` |
| `DO_SSH_KEY` | Private deploy-key contents |
| `DO_PORT` | SSH port, if not 22 |
| `DATABASE_URL` | Production database URL used by the CI build |
| `BETTER_AUTH_URL` | Public production auth URL |
| `NEXT_PUBLIC_APP_URL` | Public production app URL |

There is no `DO_APP_PATH` secret: the workflow target is fixed at
`/opt/nextjs-app`. The workflow does not copy `.env`; manage that file on the
droplet independently.

## 5. Configure the authenticated worker cron

Generate a strong secret on the droplet and set it as `CRON_SECRET` in
`/opt/nextjs-app/.env`. The systemd service reads that file, so restart the
service after changing the value:

```bash
openssl rand -hex 32
sudo systemctl restart nextjs
```

The worker rejects requests without `Authorization: Bearer <CRON_SECRET>`.
Install a root-readable curl config containing the same secret:

```bash
sudo install -m 600 /dev/null /etc/nextjs-worker.curl
sudoedit /etc/nextjs-worker.curl
```

Put these lines in the curl config, replacing the placeholder with the value
from `CRON_SECRET`:

```text
url = "http://127.0.0.1:3000/api/worker"
header = "Authorization: Bearer REPLACE_WITH_CRON_SECRET"
silent
show-error
fail
```

Install a system cron job (not Vercel Cron):

```bash
sudo crontab -e
```

Add:

```cron
* * * * * /usr/bin/curl --config /etc/nextjs-worker.curl >/dev/null 2>&1
```

Verify the job is installed with `sudo crontab -l` and check
`journalctl -u nextjs` after a pending translation is queued. Without this
job, posts can remain in `PROCESSING` indefinitely.

## 6. Deploy

After the initial server setup and baseline resolution, pushes to `main`
run `npm ci` and a build on GitHub, then copy the selected project files,
install dependencies, run `prisma migrate deploy`, build, and restart
`nextjs` on the droplet.
