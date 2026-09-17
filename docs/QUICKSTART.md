# Quick start

The simplest way to try Tournament Manager is with Docker Engine and Docker Compose.

```sh
git clone https://github.com/geercaceres/gestor-torneos.git
cd gestor-torneos
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
docker compose up -d --build
```

The setup assistant creates `.env` and prints a random password for `admin`. Save it because plaintext passwords cannot be recovered.

For local testing, keep `SITE_ADDRESS=:8080` in `.env` and open `http://localhost:8080/admin`. See [Deployment](DEPLOYMENT.md) to use a domain and HTTPS.

## Load demo data

```sh
npm ci
npm run setup:admin
npm run demo:seed -- data/demo.sqlite
```

Start the application with `DATABASE_PATH=data/demo.sqlite`. The script refuses to overwrite an existing database. All sample content is fictional and in English.

## Windows without Docker

With Node.js 24 installed:

```powershell
npm ci
npm run build:gcp
.\START-LOCAL.ps1
```

Open `http://localhost:3001/admin`. The first run generates local credentials.

## First steps

1. Configure the language, name, sport, logo, terminology, and event days.
2. Choose set-based scoring or winner with a free-form score.
3. Add participants and opening matchups.
4. Review schedules and rules before sharing the public URL.
5. Create restricted cashier or food accounts for event staff.

The [User guide](USER-GUIDE.md) explains the tournament workflow.
