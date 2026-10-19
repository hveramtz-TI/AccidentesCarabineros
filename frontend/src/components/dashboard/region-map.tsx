/**
 * Interactive Chile regions choropleth used as a dashboard filter.
 *
 * The map is a cross-filter: clicking (or Enter/Space on) a region sets the
 * Region filter and clears the commune, matching the dropdown cascade exactly
 * (S3). Selecting the active region again clears the filter. All colors come
 * from the full national series (territories.all) for the active period —
 * never from the region selection itself (S3/S4).
 *
 * The canvas is transparent on purpose (S8): the app background shows
 * through, and region fills are drawn directly on the DESIGN.md canvas plane.
 */

import { useMemo, useState } from "react"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { ZoomableGroup } from "react-simple-maps/zoom"
import { Minus, Plus } from "lucide-react"

import {
  chileFeatureCollection,
  chileMapCenter,
  chileProjection,
  joinedRegionCount,
  MAP_HEIGHT,
  MAP_WIDTH,
  regionByAbbreviation,
  regionCentersPx,
  type RegionProperties,
} from "@/lib/region-geometry"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"
import { ALL_VALUE } from "@/types/dashboard"
import type { RegionSeriesState, TerritoryRow } from "@/types/dashboard"

interface Props {
  /** Full national region series (all 16 regions, zeros included), or null until ready. */
  series: TerritoryRow[] | null
  /** Honest data state of the series (T1): never collapse error/missing into "no data". */
  state: RegionSeriesState
  activeRegion: string
  onSelectRegion: (romanNumber: string | null) => void
}

interface TooltipState {
  x: number
  y: number
  title: string
  value: string
  hint: string
}

const MAX_ZOOM = 8
const BUCKET_VARS = [
  "var(--map-bin-1)",
  "var(--map-bin-2)",
  "var(--map-bin-3)",
  "var(--map-bin-4)",
  "var(--map-bin-5)",
] as const

const fmt = (value: number) => value.toLocaleString("es-CL")

/** Legend caption next to the color ramp; mirrors the series data state (T1/S3). */
function legendCaption(state: RegionSeriesState, hasData: boolean): string {
  switch (state) {
    case "loading":
      return "cargando…"
    case "error":
      return "error al cargar"
    case "missing-series":
      return "sin serie"
    default:
      return hasData ? "vista del período" : "sin serie"
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const lower = sorted[base] ?? 0
  const upper = sorted[base + 1] ?? lower
  return lower + rest * (upper - lower)
}

export default function RegionMap({ series, state, activeRegion, onSelectRegion }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: chileMapCenter,
    zoom: 1,
  })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { rowByRoman, thresholds, hasData } = useMemo(() => {
    const rows = series ?? []
    const byRoman = new Map(rows.map((row) => [row.code, row]))
    const positives = rows
      .map((row) => row.accidents)
      .filter((accidents) => accidents > 0)
      .sort((a, b) => a - b)
    return {
      rowByRoman: byRoman,
      thresholds: [quantile(positives, 0.2), quantile(positives, 0.4), quantile(positives, 0.6), quantile(positives, 0.8)],
      hasData: rows.length > 0,
    }
  }, [series])

  function linkFor(iso: string) {
    return regionByAbbreviation.get(iso)
  }

  /** Row only when the series is genuinely loaded; every other state is data-unavailable. */
  function rowFor(romanNumber: string): TerritoryRow | undefined {
    return state === "ready" ? rowByRoman.get(romanNumber) : undefined
  }

  /**
   * Honest per-state copy (T1/S3): loading, request failure, an API that does
   * not deliver `territories.all`, a loaded zero, and a genuinely absent row
   * are five different messages — never present unavailable data as zero.
   */
  function valueText(row: TerritoryRow | undefined): string {
    if (row) return `${fmt(row.accidents)} siniestros · ${fmt(row.fatalities)} fallecidos`
    switch (state) {
      case "loading":
        return "Cargando datos…"
      case "error":
        return "Error al cargar los datos"
      case "missing-series":
        return "La API no entrega datos"
      default:
        return "Sin datos para este período"
    }
  }

  function fillFor(iso: string): string {
    const link = linkFor(iso)
    if (!link) return "var(--map-nodata)"
    if (state === "loading") return "var(--map-zero)"
    const row = rowFor(link.romanNumber)
    if (!row) return "var(--map-nodata)"
    if (row.accidents === 0) return "var(--map-zero)"
    const index = thresholds.findIndex((threshold) => row.accidents <= threshold)
    return BUCKET_VARS[index === -1 ? 4 : index]
  }

  function toggle(iso: string) {
    const link = linkFor(iso)
    if (!link) return
    onSelectRegion(activeRegion === link.romanNumber ? null : link.romanNumber)
  }

  function showTooltip(iso: string) {
    const link = linkFor(iso)
    const px = regionCentersPx.get(iso)
    if (!link || !px) return
    const selected = activeRegion === link.romanNumber
    setTooltip({
      x: Math.min(Math.max(px[0], 104), MAP_WIDTH - 104),
      y: px[1] < 150 ? px[1] + 24 : px[1] - 96,
      title: `${link.romanNumber} — ${link.name}`,
      value: valueText(rowFor(link.romanNumber)),
      hint: selected ? "Clic para quitar el filtro" : "Clic para filtrar el panel",
    })
  }

  const selectAll = activeRegion === ALL_VALUE
  const zoomInDisabled = view.zoom >= MAX_ZOOM
  const zoomOutDisabled = view.zoom <= 1

  return (
    <section
      aria-label="Mapa de las regiones de Chile. Selecciona una región para filtrar el panel."
      className={cn("relative h-full w-full overflow-hidden rounded-lg", reducedMotion && "map-reduced-motion")}
    >
      <ComposableMap
        projection={chileProjection}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        role="group"
        aria-label="Siniestros por región de Chile"
        className="h-full w-full"
      >
        <ZoomableGroup
          center={view.center}
          zoom={view.zoom}
          minZoom={1}
          maxZoom={MAX_ZOOM}
          translateExtent={[
            [0, 0],
            [MAP_WIDTH, MAP_HEIGHT],
          ]}
          onMoveEnd={({ coordinates, zoom }) =>
            setView((v) => ({ center: coordinates ?? v.center, zoom: zoom ?? v.zoom }))
          }
          filterZoomEvent={(event) => {
            // Never hijack the page: wheel zoom requires ctrl/meta, and
            // single-finger touch stays reserved for page scrolling.
            if (event.type === "wheel") {
              const wheel = event as WheelEvent
              return wheel.ctrlKey === true || wheel.metaKey === true
            }
            if (event.type === "touchstart" || event.type === "touchmove") {
              const touches = (event as TouchEvent).touches
              return touches ? touches.length >= 2 : true
            }
            return true
          }}
        >
          <Geographies geography={chileFeatureCollection}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso = (geo.properties as RegionProperties | null)?.iso ?? ""
                const link = linkFor(iso)
                const selected = link !== undefined && activeRegion === link.romanNumber
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillFor(iso)}
                    role="button"
                    aria-label={
                      link
                        ? `${link.romanNumber} ${link.name}: ${valueText(rowFor(link.romanNumber))}. ${
                            selected ? "Seleccionada: presiona para limpiar" : "Presiona para filtrar"
                          }`
                        : "Territorio sin mapear: sin datos"
                    }
                    aria-pressed={selected}
                    className={cn(
                      "rsm-geography",
                      selected && "region-selected",
                      !selectAll && !selected && "region-dim",
                      !link && "region-nodata",
                    )}
                    onClick={() => toggle(iso)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        toggle(iso)
                      }
                    }}
                    onMouseEnter={() => showTooltip(iso)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={() => showTooltip(iso)}
                    onBlur={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>

          {tooltip && (
            <g transform={`translate(${tooltip.x},${tooltip.y})`} aria-hidden="true" className="pointer-events-none">
              <rect width={208} height={72} rx={8} className="map-tooltip-box" />
              <text x={10} y={20} className="map-tooltip-title">
                {tooltip.title}
              </text>
              <text x={10} y={40} className="map-tooltip-value">
                {tooltip.value}
              </text>
              <text x={10} y={60} className="map-tooltip-hint">
                {tooltip.hint}
              </text>
            </g>
          )}
          {joinedRegionCount < 16 && (
            <g transform={`translate(14,${MAP_HEIGHT - 28})`} aria-hidden="true">
              <text className="map-tooltip-hint">
                {`unión del mapa: ${joinedRegionCount}/16 regiones`}
              </text>
            </g>
          )}
        </ZoomableGroup>
      </ComposableMap>

      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setView((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.6) }))}
          disabled={zoomInDisabled}
          aria-label="Acercar"
          className={ZOOM_BUTTON_CLASS}
        >
          <Plus aria-hidden="true" size={20} />
        </button>
        <button
          type="button"
          onClick={() => setView((v) => ({ ...v, zoom: Math.max(1, v.zoom / 1.6) }))}
          disabled={zoomOutDisabled}
          aria-label="Alejar"
          className={ZOOM_BUTTON_CLASS}
        >
          <Minus aria-hidden="true" size={20} />
        </button>
      </div>

      <div className="glass-card absolute bottom-3 left-3 flex flex-col gap-1 rounded-md px-3 py-2" aria-hidden="true">
        <span className="metric-label text-[10px]">
          Siniestros · {legendCaption(state, hasData)}
        </span>
        <div className="flex items-center gap-1">
          {BUCKET_VARS.map((variable, index) => (
            <span key={variable} className="h-2.5 w-6 rounded-sm" style={{ background: variable }} title={`rango ${index + 1}`} />
          ))}
          <span className="ml-1 h-2.5 w-6 rounded-sm border border-white/15" style={{ background: "var(--map-zero)" }} />
        </div>
      </div>
    </section>
  )
}

const ZOOM_BUTTON_CLASS =
  "focus-glow flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-white/15 bg-[#18191b] text-[#e4f1eb] shadow-sm transition-colors hover:border-[#00e599] disabled:cursor-not-allowed disabled:opacity-40"
