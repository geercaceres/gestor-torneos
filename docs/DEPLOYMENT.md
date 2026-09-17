# Deployment

## Recommended server

A small Linux VM with Docker and Docker Compose is sufficient for a tournament. Create a DNS `A` record for the subdomain pointing to the VM public IP and allow inbound traffic on ports 80 and 443.

```sh
git clone https://github.com/geercaceres/gestor-torneos.git
cd gestor-torneos
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
```

Edit `.env`:

```dotenv
PUBLIC_ORIGIN=https://tournaments.example.com
SITE_ADDRESS=tournaments.example.com
DATABASE_PATH=/data/tournament.sqlite
```

Start and verify:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 app caddy
```

Caddy obtains and renews the TLS certificate. The application and SQLite remain on the internal network; do not publish port 3001.

## Back up

```sh
docker compose exec app node scripts/backup.mjs /data/backups/tournament.sqlite
docker compose cp app:/data/backups/tournament.sqlite ./tournament-backup.sqlite
```

Store the copy outside the VM. Do not use `docker compose down -v` when data must be preserved.

## Update

Create a backup, then run:

```sh
git pull
docker compose up -d --build
```

Data migrations are applied when older documents are read.

## Checklist

- DNS resolves to the correct IP.
- HTTPS loads without warnings.
- `.env` is not tracked and has restricted permissions.
- `/admin` requires authentication.
- Cashier accounts have only the permissions they need.
- A downloaded backup has been tested.
- Logs show no repeated restarts or persistent errors.
