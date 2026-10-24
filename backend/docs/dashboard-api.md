# API de lectura del dashboard — contrato (T3)

**Estado:** contrato fijado para la implementación (T4). Las fórmulas, bases nacionales y caveats son los de `dashboard-metrics.md` — este documento solo fija la superficie HTTP. Ningún endpoint puede exponer un indicador que no esté allí.

## 1. Superficie

- `GET /api/dashboard` — único endpoint de datos: responde **todas** las secciones aprobadas para un juego de filtros en una sola pasada. Justificación: la consumidora prevista (el dashboard) carga todo junto; dividir por sección multiplicaría consultas SQL y round-trips sin consumidora independiente. No se agregan endpoints sin consumidora real.
- `GET /api/dashboard/export.csv` — exportación territorial agregada del alcance actual (archivo CSV, no JSON). Contrato completo en `reports-api.md`; mismo guard Bearer, mismos parámetros y mismos cuerpos de error que este documento.
- `GET /health` — sin cambios (contrato Cloud Run).
- **No** se expone endpoint de selectores territoriales: el frontend sigue usando el catálogo canónico versionado (`frontend/src/data/oversio-identifiers.json`) hasta que exista un consumidor que lo requiera.
- Auth: `GET /api/dashboard` exige `Authorization: Bearer <UUID_CONNECTION>` (barrera básica de request, **no** autenticación de usuarios; el valor del frontend es intencionalmente público). Sin token o con token incorrecto → `401 UNAUTHORIZED` antes de validación de query, controlador, y Prisma. Si `UUID_CONNECTION` no está configurado en el backend → `500 AUTH_NOT_CONFIGURED` (fail closed, nunca abierto). `/health` sigue público (healthcheck de Cloud Run/compose). Sin escritura, sin CRUD por tabla.
- CORS: allowlist estrecha de orígenes de browser, configurable vía `CORS_ALLOWED_ORIGINS` (lista separada por comas); default local: `http://localhost:3200` y `http://localhost:5173`. El `OPTIONS` preflight (204) se resuelve **antes** del guard Bearer y responde solo para orígenes permitidos; los errores llevan headers CORS para que el browser pueda leer `401`/`400`. El origen de producción (Cloudflare Pages) se confirma antes del despliegue.

## 2. Parámetros de query (validados por schema de la ruta; Fastify JSON Schema, sin dependencias nuevas)

| Parámetro | Tipo | Regla | Default |
|---|---|---|---|
| `from` | string `YYYY-MM-DD` | dentro de 2025-01-01..2025-12-31; `from <= to` | `2025-01-01` |
| `to` | string `YYYY-MM-DD` | idem | `2025-12-31` |
| `regionId` | integer | debe existir en `region` (1..16) | sin filtro |
| `communeId` | string (patrón `[IVX]+-[0-9]+`) | debe existir en `comuna`; si viene, **gana sobre** `regionId` (cascada: la región se deriva de la comuna) | sin filtro |

- Parámetros desconocidos: se **ignoran** (no rompen).
- Presets de periodo (`all/q1..q4`) se mapean a `from`/`to` del lado del cliente; la API solo conoce rangos.
- El dataset es un solo año: cualquier fecha fuera de 2025 es error de validación, no resultado vacío.

## 3. Respuesta `200`

Todos los valores son conteos ≤ 148.252 → números JSON seguros (sin BigInt). No se expone `siniestro_id`/`id_fuente`.

```jsonc
{
  "meta": {
    "schemaVersion": 1,
    "source": "carabineros-2025-normalized",
    "synthetic": false,
    "period": { "from": "2025-01-01", "to": "2025-12-31" },
    "filters": { "regionId": null, "communeId": null },
    "scopeLabel": "National (2025)",            // región o comuna si hay filtro
    "emptyScope": false,
    "generatedAt": "2026-10-10T00:00:00.000Z"
  },
  "kpis": {                                     // K1..K4, métricas §3.1–3.4
    "accidents": 73081,
    "fatalities": 1507,
    "injuries": 41705,
    "seriousInjuries": 7060
  },
  "monthlyTrend": [                             // SER-1: serie densa, un ítem por mes intersectado por el rango, ceros incluidos
    { "month": "2025-01", "accidents": 6040, "fatalities": 143, "injuries": 3946, "seriousInjuries": 702 }
  ],
  "severity": [                                 // SEV-1: siempre los 4 buckets MECE, en este orden exacto
    { "key": "fatal",      "label": "Fatal",            "accidents": 1339 },
    { "key": "serious",    "label": "Serious injuries", "accidents": 6018 },
    { "key": "minor",      "label": "Minor injuries",   "accidents": 21757 },
    { "key": "onlyIlesos", "label": "Uninjured only",   "accidents": 43967 }
  ],
  "territories": {                              // TRR-1
    "scope": "region",                          // "region" | "commune" (ver §5)
    "items": [                                  // top 10
      { "code": "XIII", "name": "Región Metropolitana de Santiago", "accidents": 20293, "fatalities": 402 }
    ],
    "outsideTopCount": 6,                       // unidades (regiones/comunas) fuera del top-10
    "outsideAccidents": 52788,                  // accidentes concentrados fuera del top-10
    "zeroAccidentCount": 0                      // unidades del catálogo con 0 en el filtro (nacional: 6)
  },
  "causes": {                                   // CAU-1: top 10 + otras
    "items": [
      { "id": 12, "name": "CONDUCTOR NO ATENTO CONDICIONES TRANSITO MOMENTO", "accidents": 32999, "fatalities": 159 }
    ],
    "other": { "distinctCount": 60, "accidents": 8000 }
  },
  "accidentTypes": [                            // TIP-1: todos los tipos presentes (>0), orden por accidentes desc
    { "id": 4, "name": "COLISION LATERAL", "accidents": 12201, "sharePct": 16.7 }
  ],
  "sectors": [                                  // SEC-1: urbano/rural; `sharePct` sobre siniestros filtrados
    { "id": 1, "name": "URBANO", "accidents": 54208, "sharePct": 74.2 }
  ],
  "hourBuckets": {                              // HOU-1: 8 buckets de 3h, siempre presentes en orden 0..21
    "items": [ { "hourStart": 15, "label": "15-18", "accidents": 13498 } ],
    "midnightArtifactCount": 234                // caveat §3.10 viaja SIEMPRE en la respuesta
  },
  "vehicles": {                                 // VEI-1: participación por tipo (DISTINCT siniestros, no filas)
    "items": [ { "id": 3, "name": "AUTOMOVIL", "siniestros": 51207, "sharePct": 70.1 } ],
    "other": { "accidents": 2000 },
    "note": "shares no suman 100: un siniestro puede involucrar varios tipos"
  },
  "persons": {                                  // PER-1: grano persona, filas dentro del filtro territorial/temporal
    "rows": 148252,
    "calidad":  [ { "id": 1, "name": "CONDUCTOR", "count": 105630, "sharePct": 71.3 } ],
    "sexo":     [ { "id": 1, "name": "MASCULINO", "count": 104536, "sharePct": 70.5 },
                  { "id": 3, "name": "SE IGNORA", "count": 6448, "sharePct": 4.3 } ],
    "ageBands": [ { "band": "0-17", "count": 5255 }, { "band": "unknown", "count": 23918 } ]
  }
}
```

## 4. Errores

- `400` — validación de query (formato, rango fuera de 2025, `from > to`, ID inexistente):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "from must be within 2025", "details": [ { "field": "from", "reason": "out_of_range" } ] } }
```

- `500` — fallo de base/consultas: `{ "error": { "code": "INTERNAL", "message": "dashboard query failed" } }`; sin detalles de BD ni stacks en el cuerpo (van al log estructurado de Fastify).
- `404` — cualquier otra ruta (default Fastify). El frontend no depende de rutas adicionales en esta slice.
- `204`: **no se usa**; un filtro sin datos responde `200` con `emptyScope: true` (ver §5).

## 5. Orden, estabilidad y semántica de vacíos

- Listas ordenadas por `accidents`/`count` **desc**; desempate: `code`/`id` asc. Buckets fijos (`severity`, `hourBuckets`, `ageBands`) usan el orden canónico declarado arriba, no por valor.
- `scopeLabel`/`territories.scope`: nacional → `scope: "region"` (ranking de regiones); filtro `regionId` → `scope: "commune"` (comunas de esa región); filtro `communeId` → ranking de esa única comuna (items de longitud 0/1).
- **Densidad garantizada:** `monthlyTrend` (meses del rango), `severity` (4 buckets), `hourBuckets` (8) y `ageBands` (6, incluida `unknown`) siempre vienen completos con ceros — el chart no necesita rellenar.
- `emptyScope: true` cuando el conjunto filtrado de siniestros es 0: KPIs en 0, `territories.items`/`causes.items`/`vehicles.items` vacíos, densos con ceros. Nunca se sustituyen datos nacionales.
- `sharePct`: 1 decimal, denominador siniestros filtrados (personas: filas filtradas).
- Caveats obligatorios en respuesta: `hourBuckets.midnightArtifactCount`, `vehicles.note`, banda `unknown` en edad/sexo.

## 6. Cabeceras

- `Cache-Control: no-store` (v1; el caching se decide con el wiring real).
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: no-referrer`.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- Sin paginación: payloads acotados por top-N y densidad fija (peor caso ~60 KB).

## 7. Trazabilidad métrica → contrato

| Métrica (`dashboard-metrics.md`) | Campo del contrato |
|---|---|
| K1–K4 | `kpis.accidents/fatalities/injuries/seriousInjuries` |
| SER-1 | `monthlyTrend[]` |
| SEV-1 | `severity[]` |
| TRR-1 | `territories` |
| CAU-1 | `causes` |
| TIP-1 / SEC-1 | `accidentTypes[]` / `sectors[]` |
| HOU-1 | `hourBuckets` |
| VEI-1 | `vehicles` |
| PER-1 | `persons` |

## 8. Mapa de implementación (para T4, sin decisiones abiertas)

- `backend/src/routes/dashboard.ts` — plugin Fastify `register`-ado desde `buildApp()`; schema de query (JSON Schema) y handler.
- `backend/src/controllers/dashboard-controller.ts` — mapea params validados → servicio → respuesta; traduce errores de dominio a 400/500 del §4.
- `backend/src/services/dashboard-service.ts` — agrega los indicadores; Prisma donde exprese el agregado claro; `$queryRaw` **parametrizado** para bucketeos por mes/hora. Agregación en BD, nunca filas masivas a memoria.
- `backend/src/types/dashboard-api.ts` — tipos de respuesta TS del contrato.
- Base de reconciliación T5: con filtro default, los números de §3 coinciden con las bases nacionales de `dashboard-metrics.md` §3 y el Δ=0 de §4.
