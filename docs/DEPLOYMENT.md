# Despliegue

## Servidor recomendado

Una VM pequeña con Linux, Docker y Docker Compose es suficiente para un torneo. Creá un registro DNS `A` para el subdominio apuntando a la IP pública de la VM y permití tráfico entrante en los puertos 80 y 443.

```sh
git clone https://github.com/geercaceres/gestor-torneos.git
cd gestor-torneos
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
```

Editá `.env`:

```dotenv
PUBLIC_ORIGIN=https://torneos.example.com
SITE_ADDRESS=torneos.example.com
DATABASE_PATH=/data/torneo.sqlite
```

Iniciá y verificá:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 app caddy
```

Caddy obtiene y renueva el certificado TLS. La aplicación y SQLite permanecen en la red interna; no publiques el puerto 3001.

## Respaldar

```sh
docker compose exec app node scripts/backup.mjs /data/backups/torneo.sqlite
docker compose cp app:/data/backups/torneo.sqlite ./torneo-respaldo.sqlite
```

Guardá la copia fuera de la VM. No uses `docker compose down -v` si necesitás conservar los datos.

## Actualizar

```sh
git pull
docker compose up -d --build
```

Hacé un respaldo antes. Las migraciones de datos se aplican al leer documentos anteriores.

## Lista de control

- DNS resuelve a la IP correcta.
- HTTPS carga sin advertencias.
- `.env` no está versionado y tiene permisos limitados.
- `/admin` requiere autenticación.
- Usuarios de caja sólo poseen los permisos necesarios.
- Existe un respaldo descargado y probado.
- Los logs no muestran reinicios ni errores persistentes.
