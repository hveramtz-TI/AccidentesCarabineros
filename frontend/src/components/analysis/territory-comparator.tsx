/**
 * Territory comparator (EXP-07 T6): pick up to four territories AT THE ACTIVE
 * LEVEL (regions nationally, communes when a region is selected) from the
 * local canonical catalog and compare totals, share over the scope, and a
 * small monthly series. The `/api/compare` fetch fires ONLY with a non-empty
 * selection (ODD scope item 6); with a commune selected the card explains that
 * the comparator does not apply. Shares divide by the SCOPE total — the header
 * says so explicitly, per `CMP-1`.
 */

import { useMemo, useState } from "react"

import { comparatorLevel, useCompare } from "@/hooks/use-compare"
import type { ComparatorParams } from "@/hooks/use-compare"
import { regions } from "@/lib/data"
import { monthLabel } from "@/lib/month-label"
import type { CompareTerritoryEntry } from "@/lib/api/compare"
import type { CommuneRef, RegionRef } from "@/types/dashboard"

interface Props {
  /** The current API params (already mapped from URL filters by the page). */
  params: ComparatorParams
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const MAX_CODES = 4

interface Option {
  code: string
  name: string
}

function optionsFor(params: ComparatorParams, level: "region" | "commune"): Option[] {
  if (level === "region") {
    return regions.map((region) => ({ code: region.romanNumber, name: region.name }))
  }
  const region: RegionRef | undefined = params.region
    ? regions.find((entry) => entry.romanNumber === params.region)
    : undefined
  if (!region) return []
  return region.communes.map((commune: CommuneRef) => ({ code: commune.identifier, name: commune.name }))
}

/** Compact inline sparkline; decorative — every number is in the table cells. */
function TrendSparkline({ territory }: { territory: CompareTerritoryEntry }) {
  const values = territory.trend.map((month) => month.accidents)
  const max = Math.max(1, ...values)
  const points = values
    .map((value, index) => `${(index / Math.max(1, values.length - 1)) * 88 + 4},${22 - (value / max) * 18}`)
    .join(" ")
  return (
    <svg aria-hidden="true" width="96" height="26" viewBox="0 0 96 26" className="shrink-0">
      <polyline points={points} fill="none" stroke="var(--color-chart-1, var(--primary))" strokeWidth="1.5" />
    </svg>
  )
}

function peakCell(territory: CompareTerritoryEntry): string {
  let peak: CompareTerritoryEntry["trend"][number] | undefined
  for (const month of territory.trend) {
    if (peak === undefined || month.accidents > peak.accidents) peak = month
  }
  if (!peak || peak.accidents === 0) return "—"
  return `${monthLabel(peak.month)} · ${COUNT_FORMAT.format(peak.accidents)}`
}

export default function TerritoryComparator({ params }: Props) {
  // The raw selection is kept; what the UI and the query actually use is the
  // selection FILTERED against the current level's options. That replaces a
  // setState-in-effect prune: a level change (region↔commune, or a different
  // region) never fetches stale codes, and going back restores them.
  const [rawCodes, setRawCodes] = useState<string[]>([])
  const level = comparatorLevel(params)

  const levelOptions = useMemo(
    () => (level === "commune-selected" ? [] : optionsFor(params, level)),
    [level, params],
  )
  const codes = useMemo(() => {
    const valid = new Set(levelOptions.map((option) => option.code))
    return rawCodes.filter((code) => valid.has(code))
  }, [rawCodes, levelOptions])

  const { query } = useCompare(params, codes)

  const toggle = (code: string) => {
    setRawCodes((current) => {
      if (codes.includes(code)) {
        return current.filter((candidate) => candidate !== code)
      }
      if (codes.length >= MAX_CODES) return current
      return [...current, code]
    })
  }

  if (level === "commune-selected") {
    return (
      <section aria-label="Comparador de territorios" className="glass-card min-w-0 rounded-lg p-4 md:p-5">
        <h2 className="text-base font-semibold text-foreground">Comparador de territorios</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          El comparador no aplica con una comuna seleccionada: elige un
          período, una región (o ninguna) y podrás comparar hasta cuatro
          territorios de ese nivel.
        </p>
      </section>
    )
  }

  const atMax = codes.length >= MAX_CODES
  const selectedOptions = levelOptions.filter((option) => codes.includes(option.code))

  return (
    <section aria-label="Comparador de territorios" className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <h2 className="text-base font-semibold text-foreground">Comparador de territorios</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {level === "region"
          ? "Compara hasta 4 regiones entre sí."
          : "Compara hasta 4 comunas de la región seleccionada."}{" "}
        La participación siempre se mide sobre el total del alcance, no sobre
        la selección.
      </p>

      <fieldset className="mt-4 min-w-0">
        <legend className="metric-label mb-2">Territorios a comparar</legend>
        <div className="flex flex-wrap gap-2">
          {levelOptions.map((option) => {
            const selected = codes.includes(option.code)
            return (
              <button
                key={option.code}
                type="button"
                aria-pressed={selected}
                disabled={!selected && atMax}
                onClick={() => toggle(option.code)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="font-mono text-xs">{option.code}</span>
                <span className="max-w-40 truncate">{option.name}</span>
              </button>
            )
          })}
        </div>
        {codes.length > 0 ? (
          <button
            type="button"
            onClick={() => setRawCodes([])}
            className="mt-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Limpiar selección
          </button>
        ) : null}
        {atMax ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Máximo {MAX_CODES} territorios por comparación (límite del contrato
            v1).
          </p>
        ) : null}
      </fieldset>

      {codes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Selecciona territorios para ver su comparación. No se consulta la API
          hasta que hay al menos uno.
        </p>
      ) : query.status === "error" ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
          <span>{query.error ?? "el comparador no respondió"}</span>
          <button
            type="button"
            onClick={query.retry}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Comparación de los territorios seleccionados: siniestros,
              fallecidos, participación sobre el alcance y mes pico.
            </caption>
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th scope="col" className="p-2 font-normal text-muted-foreground">Territorio</th>
                <th scope="col" className="p-2 text-right font-normal text-muted-foreground">Siniestros</th>
                <th scope="col" className="p-2 text-right font-normal text-muted-foreground">Fallecidos</th>
                <th scope="col" className="p-2 text-right font-normal text-muted-foreground">Part. sobre alcance</th>
                <th scope="col" className="p-2 font-normal text-muted-foreground">Mes pico</th>
                <th scope="col" className="p-2 font-normal text-muted-foreground">Serie mensual</th>
              </tr>
            </thead>
            <tbody>
              {query.data === null
                ? selectedOptions.map((option) => (
                    <tr key={option.code} className="border-b border-border/40 last:border-0">
                      <td className="p-2" colSpan={6}>
                        <span className="block h-6 w-full animate-pulse rounded bg-muted" aria-hidden="true" />
                        <span className="sr-only">Cargando {option.name}</span>
                      </td>
                    </tr>
                  ))
                : query.data.territories.map((territory) => (
                    <tr key={territory.code} className="border-b border-border/40 last:border-0">
                      <th scope="row" className="p-2 text-left font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">{territory.code}</span>{" "}
                        {territory.name}
                      </th>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {COUNT_FORMAT.format(territory.totals.accidents)}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {COUNT_FORMAT.format(territory.totals.fatalities)}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {SHARE_FORMAT.format(territory.totals.share)} %
                      </td>
                      <td className="p-2 text-muted-foreground">{peakCell(territory)}</td>
                      <td className="p-2">
                        <TrendSparkline territory={territory} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
