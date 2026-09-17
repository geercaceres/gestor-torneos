# Guía de uso

## 1. Preparar el torneo

Entrá a `/admin` y abrí **Torneo y reglas**. Definí la identidad, el deporte, las palabras que usa tu disciplina, la moneda, el local y las jornadas. El logo y el afiche aceptan una ruta dentro de `public`, por ejemplo `/logo.png`, o un enlace HTTPS.

Elegí el método de resultado:

- **Ganador y marcador libre** sirve para cualquier deporte.
- **Resultado por sets** calcula quién ganó según los sets registrados.

El motor actual genera eliminación directa para 2, 4, 8, 16 o 32 lugares.

## 2. Cargar participantes y horarios

En **Participantes**, escribí los nombres en el orden de los cruces. Un lugar vacío puede convertirse en pase libre antes de iniciar el cuadro.

En **Partidos**, ajustá fecha, hora, duración y área de juego. La reprogramación automática respeta las jornadas, la disponibilidad de áreas y las dependencias entre rondas.

## 3. Operar el evento

Usá los estados **Programado**, **Llamado** y **En juego** para que el sitio público muestre lo que ocurre. Una misma cancha no puede tener dos partidos activos. Al finalizar, registrá el ganador, el marcador o una ausencia justificada.

La vista `/pantalla` sirve para un televisor o proyector. Los cambios del administrador aparecen en el sitio público al actualizarse.

## 4. Caja, inventario y comidas

Creá productos con costo, precio, stock mínimo y disponibilidad. Caja descuenta existencias al registrar una venta y separa efectivo de transferencias. Las anulaciones requieren motivo y devuelven el stock.

El reporte muestra ingresos, costos, margen bruto, unidades y ventas por producto, operador y día; también permite exportar CSV.

## 5. Usuarios y permisos

Administración puede crear usuarios por función. Asigná sólo los módulos necesarios: torneo, partidos, productos, caja, reportes o usuarios. No compartas la cuenta principal entre operadores.

## 6. Después del torneo

Exportá la información pública y generá un respaldo consistente de SQLite. Conservá la copia fuera del servidor antes de actualizar o apagar la infraestructura. Consultá [Despliegue](DEPLOYMENT.md) para los comandos.
