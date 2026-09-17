# Preguntas frecuentes

## ¿Sirve para deportes distintos al pádel?

Sí. Podés cambiar deporte, participante, área de juego, moneda, reglas y método de resultado. El cuadro sigue siendo de eliminación directa.

## ¿Administra varios torneos desde una instalación?

Todavía no. Cada instalación administra un torneo. Multi-torneo y organizaciones están en el [roadmap](../ROADMAP.md).

## ¿Dónde se guardan los datos?

En un archivo SQLite indicado por `DATABASE_PATH`. El volumen de Docker conserva ese archivo entre reconstrucciones.

## ¿Puedo recuperar la contraseña del administrador?

No en texto plano. Las contraseñas se guardan con scrypt. Generá credenciales nuevas desde un acceso seguro al servidor.

## ¿Qué información es pública?

Identidad, participantes, programación, resultados, reglas, contacto, ubicación, menú y datos de transferencia cargados en el torneo. Usuarios, contraseñas, costos y reportes permanecen privados.

## ¿Cómo pruebo sin usar datos reales?

Usá `npm run demo:seed -- data/demo.sqlite`. Nunca publiques una base real para crear capturas o reportar errores.

## ¿Por qué no cambia el formato después de comenzar?

Cambiar el método de resultado o la cantidad de sets invalidaría resultados ya disputados. Reabrí esos resultados antes de modificar el formato.
