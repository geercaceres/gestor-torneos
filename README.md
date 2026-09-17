# Gestor de Torneos

Aplicación web libre para organizar y publicar torneos deportivos de eliminación directa. Funciona con pádel, tenis, fútbol, vóley, básquet, e-sports y otras disciplinas: cada instalación permite definir su nombre, deporte, vocabulario, moneda, reglas, marcador, jornadas y áreas de juego.

## Funciones

- Sitio público adaptable a celular y escritorio: próximos partidos, programación, resultados, cuadro, participantes, reglas, ubicación, transferencias y menú.
- Panel de administración para participantes, horarios, llamados, encuentros en juego, resultados, W.O., avisos y reglas.
- Cuadros de 2, 4, 8, 16 o 32 lugares, una o varias jornadas y hasta 8 áreas de juego.
- Resultado por sets o modo genérico de ganador y marcador libre.
- Caja e inventario opcionales: productos, costo, precio, stock, ventas, anulaciones y reportes CSV.
- RBAC con roles de administración, organización, responsable de comidas y caja.
- Vista para pantalla o proyector en `/pantalla`.
- SQLite, historial de cambios y exportación del torneo.
- Docker Compose y Caddy con HTTPS automático.

Cada instalación administra un torneo. No es todavía una plataforma multiempresa ni incluye pagos en línea, inscripción pública o notificaciones automáticas.

## Inicio rápido con Docker

Requisitos: Docker Engine, Docker Compose y un dominio o subdominio que apunte al servidor.

```sh
git clone https://github.com/geercaceres/gestor-torneos.git
cd gestor-torneos
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
```

El último comando crea `.env` y muestra una contraseña aleatoria para `admin`. Guardala en un gestor de contraseñas. Editá `.env`:

```dotenv
PUBLIC_ORIGIN=https://torneos.example.com
SITE_ADDRESS=torneos.example.com
DATABASE_PATH=/data/torneo.sqlite
```

Luego iniciá la aplicación:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 app caddy
```

Abrí `https://torneos.example.com/admin`, ingresá como `admin` y configurá:

1. Nombre, marca, deporte y descripción.
2. Cómo se llama cada participante y cada área de juego.
3. Moneda, inscripción y premios.
4. Fechas, horarios, cantidad de áreas y duración de turnos.
5. Método de resultado: sets o ganador con marcador libre.
6. Participantes, reglas, ubicación y enlaces públicos.

Caddy solicita el certificado TLS y redirige HTTP a HTTPS. El puerto 3001 y SQLite no deben exponerse a Internet.

## Ejecutar en Windows

Instalá Node.js 24, ejecutá lo siguiente una vez y luego usá `INICIAR-LOCAL.ps1`:

```powershell
npm ci
npm run build:gcp
.\INICIAR-LOCAL.ps1
```

La primera ejecución genera credenciales locales. Administración queda en `http://localhost:3001/admin`.

## Desarrollo

```sh
npm ci
npm run setup:admin
```

En dos terminales:

```sh
node server/server.mjs
npm run dev
```

El frontend de desarrollo abre en `http://localhost:3000` y usa la API local en el puerto 3001.

Validaciones:

```sh
npm run typecheck
npm test
npm run build:gcp
```

## Personalización

La sección **Administración → Torneo y reglas** permite configurar sin editar código:

- nombre, marca, frase, descripción y afiche;
- deporte o disciplina;
- `Equipo/Equipos`, `Pareja/Parejas`, `Jugador/Jugadores` u otros términos;
- `Cancha/Canchas`, `Pista/Pistas`, `Campo/Campos` u otros términos;
- moneda mediante código ISO (`PYG`, `USD`, `ARS`, etc.);
- formato por sets o resultado genérico;
- reglamento, contacto, Google Maps, WhatsApp y datos de transferencia.

La competición actual es de eliminación directa. Un formato de grupos, liga o doble eliminación requerirá un motor de competición adicional.

## Respaldos

Para obtener una copia consistente de SQLite con el servidor activo:

```sh
docker compose exec app node scripts/backup.mjs /data/backups/torneo.sqlite
docker compose cp app:/data/backups/torneo.sqlite ./torneo-respaldo.sqlite
```

No ejecutes `docker compose down -v` si querés conservar los datos. Guardá los respaldos fuera del servidor.

## Actualizaciones

Hacé un respaldo, actualizá el código sin reemplazar `.env` ni el volumen y reconstruí:

```sh
git pull
docker compose up -d --build
```

## Seguridad

- Contraseñas con scrypt y salt; nunca se guardan en texto plano.
- Cookies HttpOnly, SameSite Strict y Secure en producción.
- Autorización RBAC en servidor, protección de origen y límite de intentos.
- Transacciones para ventas e inventario y control de revisiones simultáneas.
- La información cargada en reglas, participantes, contacto y enlaces es pública.

Reportá vulnerabilidades de forma privada al responsable del repositorio. No publiques credenciales, bases de datos ni datos reales de participantes en un issue.

## Licencia

[MIT](LICENSE). Podés usar, modificar y redistribuir el proyecto conservando el aviso de licencia.
