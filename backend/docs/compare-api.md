# API de lectura del comparador territorial — contrato (EXP-07)

**Estado:** contrato fijado para la implementación. Este documento define la
superficie HTTP de `GET /api/compare`. Las fórmulas y definiciones de los
indicadores son las de `dashboard-metrics.md` (`CMP-1`); los parámetros de
filtro y los cuerpos de error son idénticos a `dashboard-api.md` (mismo guard,
misma validación). El comparador es **agregado**: no expone filas de hecho ni
PII, y no existe aún en `/api/analysis` (se sirve aparte por ser una consulta
de múltiples territorios).

## 1. Superficie

- `GET /api/compare` — informe comparativo de 1 a 4 territorios del nivel
  activo. Es el único endpoint nuevo de EXP-07; `GET /api/analysis` se extendió
  con `trend` y `weekdayHours` **sin** un endpoint por pestaña (regla aditiva).
- Auth y CORS: idénticos a `/api/dashboard` — `Authorization: Bearer
  <UUID_CONNECTION>` exigida antes de cualquier consulta (`401 UNAUTHORIZED`;
  `500 AUTH_NOT_CONFIGURED` si falta el token). `/health` público.

## 2. Parámetros de query

| Parámetro | Tipo | Regla | Default |
|---|---|---|---|
| `from` / `to` | `YYYY-MM-DD` | dentro de 2025; `from <= to` (contrato de `dashboard-api.md` §2) | `2025-01-01` / `2025-12-31` |
| `regionId` | integer 1..16 | si viene, el nivel activo pasa a comunas de esa región | sin filtro |
| `communeId` | `[IVX]+-[0-9]+` | gana sobre `regionId`; **con comuna seleccionada el comparador no aplica** → `400` | sin filtro |
| `codes` | string | lista separada por comas, **1..4 identificadores efectivos** tras recortar y de-duplicar (se conserva el orden de la primera aparición) | requerido |

Nivel activo derivado de los filtros (decisión de usuario EXP-07): nacional →
regiones; región seleccionada → comunas de esa región; comuna seleccionada →
deshabilitado (`400`). Sin parámetro `level` explícito en v1: los filtros ya
fijan el nivel y una contradicción habría sido superficie muerta.

### Reglas de `codes` (en orden)

1. Vacío/ausente/solo separadores → `400` `details [{field:"codes",
   reason:"required"}]` **antes** de cualquier lectura.
2. De-duplicar y recortar; > 4 distintos → `400 reason:"too_many_codes"`
   antes de leer el catálogo.
3. Forma de identificador inválida (no `roman` o `roman-N`: `^[IVX]+(-[0-9]+)?$`)
   → `400 reason:"invalid_format"` antes de leer el catálogo.
4. Miembro del catálogo del nivel: se valida contra la **misma** agregación de
   nivel (un solo `GROUP BY` del catálogo del alcance devuelve códigos, nombres,
   totales y el denominador). Código con forma válida pero inexistente en el
   nivel/alcance → `400 reason:"not_found"`; comuna cuyo prefijo romano no es la
   región seleccionada → `400 reason:"out_of_scope"`. Un rechazo **nunca** ejecuta
   la segunda agregación (tendencias).
5. Alcance comuna → `400 reason:"not_supported"` (el frontend oculta el
   comparador; la API se niega igual, defensa en profundidad).

## 3. Respuesta `200`

```jsonc
{
  "schemaVersion": 1,
  "meta": { "generatedAt": "…" },
  "level": "region",                    // "region" | "commune" (nivel activo)
  "period": { "from": "2025-01-01", "to": "2025-12-31" },
  "filters": { "from": …, "to": …, "regionId": …, "communeId": … }, // echo con cascada comuna→región como /api/dashboard
  "territories": [
    {
      "code": "XIII",                   // identificador de catálogo/API, en ORDEN DE PEDIDO (tras de-dup)
      "name": "Región Metropolitana de Santiago",
      "totals": { "accidents": 20293, "fatalities": 350, "share": 27.8 },
      "trend": [                        // denso sobre el período pedido, orden calendario
        { "month": "2025-01", "accidents": 6040, "fatalities": 143 },
        { "month": "2025-02", "accidents": 5458, "fatalities": 118 }
        // …
      ]
    }
    // … 1..4 entradas
  ]
}
```

- `share` = `accidents` / **total del alcance** (suma de todos los territorios
  del nivel, que concilia con `kpis.accidents`/`causes.totalAccidents`) × 100,
  un decimal con el `percent()` compartido. **Nunca** se renormaliza a la
  selección: seleccionar 4 territorios no hace que sus shares sumen 100.
- `trend` es la misma definición `SER-1`/`TRE-1` del análisis, por territorio,
  densa sobre el período (`12` filas con defaults).
- Territorio con `0` siniestros en el alcance es una fila real con `0` y
  `share: 0` (el cero es valor, no ausencia) — mismo principio que `TRR-1`.
- Payload acotado: 4 territorios × 12 meses ≈ < 10 KB (medido en tests; el cap
  duro de 100 KB de `analysis-api.md` queda holgado).
- No se expone ningún id interno: `code` es el identificador de catálogo.

## 4. Cache

`Cache-Control: private, max-age=60` en `200` (sobrescribe el `no-store` del
guard); rechazos y fallos conservan `no-store`.

## 5. Errores

Mismos cuerpos que `dashboard-api.md`/`analysis-api.md`: `401`
`UNAUTHORIZED`; `400` `VALIDATION_ERROR` con `details: [{field, reason}]`
(`reasons` de `codes` en §2; fechas/`regionId`/`communeId` como el dashboard);
`500` `INTERNAL` con mensaje `"compare query failed"` sin detalles de base de
datos ni stack.

## 6. Consumidora prevista

La pestaña **Tendencias** (`/analisis/tendencias`): selector local de hasta 4
territorios del nivel activo (catálogo `oversio-identifiers.json`), oculto con
nota explicativa cuando hay comuna seleccionada. La consulta se dispara solo
con ≥1 selección; las participaciones se etiquetan explícitamente como
participación sobre el alcance total.

## 7. Fuera de alcance

- Exportar la comparación (CSV u otro), más de 4 territorios, comparar
  períodos, o comparar niveles mezclados.
- Predicción, scoring o cualquier índice sintético.
