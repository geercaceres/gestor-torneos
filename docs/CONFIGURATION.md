# Configuración

La configuración técnica se guarda en `.env`. No confirmes este archivo en Git.

| Variable | Uso | Ejemplo |
| --- | --- | --- |
| `ADMIN_PASSWORD_SALT` | Salt hexadecimal generado por el asistente | secreto |
| `ADMIN_PASSWORD_HASH` | Hash scrypt de la contraseña inicial | secreto |
| `PUBLIC_ORIGIN` | Origen público permitido | `https://torneos.example.com` |
| `DATABASE_PATH` | Ruta de SQLite | `/data/torneo.sqlite` |
| `SITE_ADDRESS` | Dominio o puerto que atiende Caddy | `torneos.example.com` |
| `HOST` | Interfaz del servidor Node | `0.0.0.0` |
| `PORT` | Puerto interno de la aplicación | `3001` |
| `TRUST_PROXY` | Confía en cabeceras del proxy configurado | `1` con Caddy |
| `NODE_ENV` | Activa cookies seguras y comportamiento de producción | `production` |

Ejecutá `node scripts/setup.mjs` o `npm run setup:admin` para generar las credenciales; no escribas contraseñas ni hashes manualmente.

## Personalización visible

Desde **Administración → Torneo y reglas** se configuran nombre, marca, logo, afiche, deporte, vocabulario, moneda, reglas, contacto y enlaces. La información de participantes, transferencias y contacto es pública.

Para usar archivos locales, copialos en `public/` y guardá una ruta como `/logo.png`. Los enlaces remotos deben usar HTTPS.
