# Exportación territorial en CSV — contrato (EXP-06)

**Estado:** contrato fijado y vigente. Este documento define la superficie HTTP de
`GET /api/dashboard/export.csv`. Las fórmulas, bases nacionales y caveats de los
indicadores son los de `dashboard-metrics.md`; los parámetros de filtro y los
cuerpos de error son los de `dashboard-api.md` (mismo guard, misma validación).
El export es **agregado territorial**: no expone filas de siniestros, personas o
vehículos, ni PII, ni identificadores internos de base de datos.

## 1. Superficie

- `GET /api/dashboard/export.csv` — único endpoint de descarga: informe
  territorial para el alcance de filtros actual. No se agregan exportaciones de
  causas, vehículos ni personas (decisión de alcance EXP-06; requerirían un ODD
  nuevo).
- Auth: idéntica a `/api/dashboard` — `Authorization: Bearer
  <UUID_CONNECTION>` exigida **antes** de cualquier consulta (`401 UNAUTHORIZED`;
  `500 AUTH_NOT_CONFIGURED` si el servidor no tiene token). CORS y headers de
  seguridad: sin cambios.
- Sin servidor de PDF/Excel ni dependencias nuevas: la serialización CSV es
  propia (RFC 4180) y la impresión se resuelve en el navegador.

## 2. Parámetros de query

Mismos que `dashboard-api.md` §2: `from`, `to` (`YYYY-MM-DD`, dentro de 2025,
`from <= to`), `regionId` (1..16), `communeId` (`^[IVX]+-[0-9]+$`, gana sobre
`regionId`). Defaults: `2025-01-01` / `2025-12-31`, sin filtro territorial.
Cualquier fecha fuera de 2025 es error `400 VALIDATION_ERROR`, nunca un CSV
vacío. Respuestas `400`/`401`/`500` conservan los cuerpos JSON documentados en
`dashboard-api.md` (el CSV solo aparece en respuestas `200`).

## 3. Archivos y orden de filas

El CSV reproduce `territories.all` de `/api/dashboard` para los mismos filtros:

| Alcance | Filas | Nivel |
|---|---|---|
| Nacional | las 16 regiones | `Región` |
| Región seleccionada | todas las comunas del catálogo de esa región, **incluidas las de 0 siniestros** | `Comuna` |
| Comuna seleccionada | esa única comuna | `Comuna` |

Orden: `siniestros` DESC, desempate por código ASC (idéntico al dashboard).
Un alcance válido sin ningún territorio responde `200` con **solo la fila de
encabezado** (no es un error). El cero sigue siendo distinguible de faltante:
las comunas de catálogo sin siniestros se exportan con `0`.

## 4. Formato del archivo

- Codificación: UTF-8 **con BOM** (Excel abre los acentos correctamente).
- Fin de línea: `CRLF` en todas las filas, incluida la última.
- Reglas RFC 4180: separador `,`; una celda se entrecomilla si contiene `,`,
  `"`, CR o LF; las comillas internas se duplican (`""`).
- Fila de encabezado exacta:
  `nivel,codigo_region,region,codigo_comuna,comuna,siniestros,fallecidos,participacion`

Columnas:

- `codigo_region` / `codigo_comuna`: identificadores de catálogo/API
  (`numero_romano` tipo `XIII`; comuna tipo `XIII-1`). Nunca claves internas.
- En alcance nacional, `codigo_comuna` y `comuna` van vacías.
- `siniestros` y `fallecidos`: enteros sin separador de miles y sin comillas.
- `participacion`: participación de la fila sobre el total del alcance actual
  (denominador = suma de `siniestros` de las filas exportadas, que concilia con
  `kpis.accidents` de `/api/dashboard`). **Un decimal, coma decimal al estilo
  es-CL** (`45,2`), decisión EXP-06. Como el separador de campos es la coma, la
  celda va **siempre entrecomillada** (`"45,2"`). Total 0 → `"0,0"`. El
  redondeo es el mismo `percent()` que publica `sharePct` en el dashboard.
- Las participaciones de una misma columna no tienen por qué sumar exactamente
  `100,0` por redondeo; se documenta como caveat en el informe.

## 5. Sanitización antiinyección de fórmulas

Toda celda de texto (`nivel`, nombres y códigos) que empiece con `=`, `+`, `-`,
`@`, tabulador o CR se prefija con `'` (apóstrofo). No se elimina texto
legítimo. Las celdas numéricas no se tocan. La cita RFC 4180 se aplica sobre el
valor ya sanitizado.

## 6. Límites

- Cifras máximas: **≤ 346 filas** de datos y **≤ 50 KB** serializado (el
  catálogo completo de comunas por región queda holgadamente por debajo).
- Si una respuesta excediera alguno de los límites → `400` con el cuerpo
  `VALIDATION_ERROR` compartido y `details: [{ "field": "export", "reason":
  "too_large" }]`. **Nunca se trunca en silencio.**
- La agregación corre en SQL (`queryTerritories`, la misma consulta del
  dashboard vía un helper compartido del servicio); el servicio Node jamás
  carga filas de hecho.

## 7. Headers de la respuesta `200`

| Header | Valor |
|---|---|
| `Content-Type` | `text/csv; charset=utf-8` |
| `Content-Disposition` | `attachment; filename="accidentes-2025-territorios.csv"` (fijo, sin fecha) |
| `Cache-Control` | `no-store` (heredado del guard) |
| Headers de seguridad | sin cambios (`nosniff`, `Referrer-Policy`, HSTS) |

## 8. Consumidora prevista

La página `/informes` ofrece un botón **"Descargar CSV"** que pide este
endpoint con `fetch` + `Authorization` (un `<a href>` directo daría `401`) y
guarda el blob como `accidentes-2025-territorios.csv`, llevando los mismos
filtros de la URL. La impresión del informe es del navegador (`window.print`),
no un artifact del servidor.
