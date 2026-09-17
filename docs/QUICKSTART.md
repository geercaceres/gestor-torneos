# Inicio rápido

La forma más simple de probar Gestor de Torneos es con Docker. Necesitás Docker Engine y Docker Compose.

```sh
git clone https://github.com/geercaceres/gestor-torneos.git
cd gestor-torneos
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
docker compose up -d --build
```

El asistente crea `.env` y muestra una contraseña aleatoria para `admin`. Guardala: no se puede recuperar en texto plano.

Para una prueba local, dejá `SITE_ADDRESS=:8080` en `.env` y abrí `http://localhost:8080/admin`. Para publicar con dominio y HTTPS, consultá [Despliegue](DEPLOYMENT.md).

## Cargar datos de demostración

```sh
npm ci
npm run setup:admin
npm run demo:seed -- data/demo.sqlite
```

Después iniciá la aplicación usando `DATABASE_PATH=data/demo.sqlite`. El script se niega a sobrescribir una base existente.

## Windows sin Docker

Con Node.js 24 instalado:

```powershell
npm ci
npm run build:gcp
.\INICIAR-LOCAL.ps1
```

Abrí `http://localhost:3001/admin`. La primera ejecución genera credenciales locales.

## Primeros pasos

1. Configurá nombre, deporte, logo, vocabulario y jornadas.
2. Elegí resultado por sets o ganador con marcador libre.
3. Definí participantes y cruces iniciales.
4. Revisá horarios y reglas antes de compartir la URL pública.
5. Creá usuarios limitados para caja o comidas si otras personas colaborarán.

La [Guía de uso](USER-GUIDE.md) explica el día del torneo paso a paso.
