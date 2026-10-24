# Métricas del dashboard — definiciones validadas con datos 2025

**Estado:** aprobado en la puerta de decisión T2 del ODD `odd/tasks/local-dashboard-read-api.md` (usuario, 2026-10-10). Este documento es la fuente de verdad de las fórmulas: la API de lectura (T3/T4) no puede definir un indicador que aquí no esté, y ningún número puede mostrarse como estadística oficial si su caveat asociado no viaja con él.

**Fuente:** base PostgreSQL local (`accidentes`, esquema del MER en `MER.md`) cargada desde los tres Excel 2025 de Carabineros. Todos los números "base nacional" de este documento fueron medidos con SQL contra esa carga verificada del T1 (73.081 / 148.252 / 130.234 filas, 0 errores).

## 1. Decisiones generales

- **Grano de los KPIs y distribuciones:** `siniestro`. Las columnas de conteo del siniestro y los resultados por persona **reconcilian en exacto** (ver §4), así que no hay riesgo de doble conteo; se usa el grano siniestro por costo (una tabla, índice `fecha`) y el grano persona solo para demografía (§3.10).
- **Región:** siempre vía `siniestro.comuna_id → comuna.region_id`. `ZONA` es un lookup independiente (16 valores que cruzan regiones) y **no** se expone como filtro territorial.
- **Cuarto KPI:** el indicador sintético `activeCases` (factor fijo 6,6 %) se descarta. Lo reemplaza **Lesionados graves**, con definición propia y verificada (decisión del usuario 2026-10-10).
- **Distribución de severidad:** el bucket sintético "Property damage" no existe en la fuente; se reemplaza por **Sin lesionados (solo ilesos)**.

## 2. Filtros soportados

Se aplican a todos los indicadores sobre el mismo conjunto de siniestros filtrados:

| Filtro | Parámetro | Reglas |
|---|---|---|
| Periodo | `desde`, `hasta` (fechas ISO) dentro de 2025-01-01..2025-12-31; presets por mes/trimestre | Filtra `siniestro.fecha` |
| Región | `region_id` | Vía JOIN con `comuna`; nunca desde `zona` |
| Comuna | `comuna_id` | Cascada: si hay comuna, la región se ignora/deriva |

Con un filtro territorial activo, el ranking muestra comunas (o regiones si solo hay región). Un filtro sin resultados devuelve series con ceros y `emptyScope: true`, nunca datos nacionales disfrazados.

## 3. Indicadores aprobados

### 3.1–3.4 KPIs (4 tarjetas)

| # | Indicador | Fórmula | Grano | Base nacional 2025 |
|---|---|---|---|---:|
| K1 | Accidentes | `COUNT(*)` en siniestro | siniestro | 73.081 |
| K2 | Fallecidos | `SUM(fallecidos)` | siniestro | 1.507 |
| K3 | Lesionados | `SUM(lesionados_graves + lesionados_menos_graves + lesionados_leves)` | siniestro | 41.705 |
| K4 | Lesionados graves | `SUM(lesionados_graves)` | siniestro | 7.060 |

Cada tarjeta lleva sparkline con la serie mensual de su propio valor (§3.5). Caveat: son conteos, no tasas; no comparar con años parciales porque solo existe 2025.

### 3.5 Tendencia mensual (`SER-1`)

Agrupado por `to_char(fecha,'YYYY-MM')`: accidentes, fallecidos, lesionados (y lesionados graves si el cliente lo pide). Base: rango mensual de accidentes 5.458 (feb) – 6.791 (mar); fallecidos 102–152/mes. Sin distribución artificial: los valores reales por mes existen en la fuente.

### 3.6 Severidad MECE (`SEV-1`) — grano siniestro

Clasificación por siniestro, estrictamente jerárquica (una fila cae en exactamente un bucket):

| Bucket | Regla | Base 2025 |
|---|---|---:|
| Fatal | `fallecidos > 0` | 1.339 (1,8 %) |
| Grave (no fatal) | sin fallecidos y `lesionados_graves > 0` | 6.018 |
| Leve (no grave) | sin fallecidos/graves y (`lesionados_menos_graves > 0` OR `lesionados_leves > 0`) | 21.757 |
| Sin lesionados (solo ilesos) | sin lesiones y `ilesos > 0` | 43.967 |

La suma es 73.081 y el bucket "todos-cero" medido es 0. Caveat: describe **siniestros**, no personas; no sumar con §3.10.

### 3.7 Ranking territorial (`TRR-1`)

Top N (por defecto 10) por accidentes, con `nombre_normal` y `region_id`/`numero_romano` canónicos. Base nacional: XIII 20.293 (27,8 %), VIII 8.196, V 7.231, VII 6.971, IX 5.588; comunas: Temuco 2.079, Antofagasta 1.891, Concepción 1.843. Caveats: rango por comuna 1–2.079 (cola larga; el ranking se lee top-N, no distribución); 6 comunas del catálogo tienen cero accidentes y deben poder distinguirse de "sin datos" (el catálogo manda, la consulta solo aporta conteos).

### 3.8 Causas (`CAU-1`)

Top 10 por accidentes + bucket "otras". Base: "conductor no atento…" 32.999 (45,1 %); ebriedad 5.444; 7 de 70 causas tienen <10 accidentes (van a "otras"). Columna secundaria `fallecidos` por causa: velocidad no razonable produce 253 muertes con solo 2.540 siniestros — la más letal; **no** ordenar el gráfico solo por accidentes si se quiere señalar letalidad (decisión de visualización, no de fórmula). Caveat: una causa por siniestro (columna fuente `CAUSA` única).

**Participación acumulada (`CAU-2`, EXP-03):** suma corrida de las participaciones (accidentes acumulados / total filtrado) en el orden descendente de la API (`accidents` DESC, `name` ASC), expresada con un decimal. No es un campo de la respuesta: se calcula en el frontend sobre las 70 causas del catálogo y se rotula explícitamente como acumulada. Cuando el total filtrado es 0, todas las participaciones —incluida la acumulada— son 0.

### 3.9 Tipo y sector (`TIP-1`, `SEC-1`)

Distribución de los 15 `tipo_siniestro` (colisión lateral 16,7 %, colisión 14,6 %, choque 12,3 %, …) y sector urbano/rural (74,2 % / 25,8 %). Caveat: `TIPO` de siniestros ≠ `TIPO` de vehículos; no compartir dominio.

### 3.10 Franjas horarias (`HOU-1`)

`HORA` en 8 buckets de 3 horas. Base: picos 15–18 h (13.498) y 18–21 h (13.395); valley 00–03 (3.334). Caveat obligatorio: **234 siniestros (0,3 %) con hora exacta 00:00:00** — artefacto probable de hora faltante en el Excel; se incluyen en 00–03 y se disclose, no se reasignan.

### 3.11 Vehículos (`VEI-1`) — opcional confirmado

Participación por `tipo_vehiculo`: `COUNT(DISTINCT siniestro_id)` / total filtrado (denominador = siniestros, no filas; 2 siniestros no tienen vehículos). Base: automóvil 70,1 %, camioneta 23,5 %, jeep 14,6 %, moto 9,0 %. Top 10 + "otras". Desglose secundario opcional por `servicio_vehiculo`: top 8 + otras (particular 85,7 % de filas; cola ruidosa). Caveat: promedio 1,78 vehículos/siniestro, máximo 18 — las participaciones no suman 100 % (un siniestro puede tener varios tipos).

**Matriz tipo × severidad (`VEI-2`, EXP-04):** para cada tipo de vehículo presente en el alcance filterado, distribución de `COUNT(DISTINCT siniestro_id)` según los buckets de severidad por siniestro de §3.6 (`fatal`, `serious`, `minor`, `onlyIlesos`). Es severidad **de siniestro**, no de persona: el mismo siniestro cuenta una sola vez por tipo y cae en exactamente un bucket, así que las celdas de un tipo reconcilian en exacto con sus siniestros por tipo. Se incluye un bucket `unknown` (todos los contadores de severidad en cero o faltantes) solo si los datos lo producen — medido: 0 siniestros así a nivel nacional, es defensivo; ninguna celda cero se emite ni se rellena. Cobertura: los siniestros sin filas de vehículo (`withoutVehicleRows`, base nacional 2) se declaran como nota de cobertura y **nunca** se asignan a un tipo. Caveat heredado de `VEI-1`: la matriz tampoco es aditiva entre tipos — un siniestro con dos tipos aparece en ambas filas; prohibido mostrar totales o acumuladas sobre las filas de tipo. Denominador de la participación: total de siniestros del alcance (§3.1), no la suma de filas.

### 3.12 Perfil de personas (`PER-1`) — opcional confirmado, **grano persona**

- Calidad: conductor 71,3 %, se da a la fuga 13,1 %, pasajero 10,7 %, peatón 4,9 % (de 148.252 filas).
- Sexo: masculino 70,5 %, femenino 25,1 %, **se ignora 4,3 %** (se muestra como categoría propia, nunca se imputa).
- Edad en bandas 0–17 / 18–25 / 26–40 / 41–64 / 65+ / **sin dato**: el 16,1 % (23.918) no tiene edad; banda "sin dato" obligatoria visible.

Caveats: son **filas persona** dentro del mismo filtro territorial/temporal (los siniestros con N personas pesan N); no mezclar con KPIs §3.1–3.4 en un mismo eje. Fuga como persona (19.478) y fuga como vehículo (3.303 siniestros con tipo "dado a la fuga") son lecturas distintas del mismo fenómeno.

## 4. Evidencia de reconciliación entre granos (nacional 2025)

| Resultado | SUM en siniestro | COUNT en persona | Δ |
|---|---:|---:|---:|
| Fallecidos | 1.507 | 1.507 | 0 |
| Graves | 7.060 | 7.060 | 0 |
| Menos graves | 3.392 | 3.392 | 0 |
| Leves | 31.253 | 31.253 | 0 |
| Ilesos | 105.040 | 105.040 | 0 |

Fallecidos por sexo: 1.172 M + 335 F + 0 "se ignora" = 1.507. Esta tabla es el checklist de reconciliación de la API (T5): cualquier endpoint que rompa Δ=0 con el mismo filtro es defecto.

## 5. Descartados (medidos, no opinados)

| Candidato | Motivo |
|---|---|
| `activeCases` | sintético (factor 6,6 %); reemplazado por Lesionados graves |
| Tribunal | 502 valores sin dominio analítico |
| CALLE_1/CALLE_2/KM | 51,7 % / 49,8 % vacíos; semántica de KM sin confirmar |
| Geocodificación / mapa | sin coordenadas en la fuente; fuera de alcance |
| Multi-año o comparativas YoY | solo existe 2025 |
| Zonas como territorio | `ZONA` cruza regiones (documentado en MER §2) |

## 6. Próximos pasos

T3 fija el contrato HTTP sobre estos indicadores (endpoint agregado del dashboard; selectores territorio siguen usando el catálogo canónico versionado del frontend mientras no haya consumidora real). T4 implementa; T5 reconcilia cada endpoint contra las bases de §3 y §4 con SQL independiente.
