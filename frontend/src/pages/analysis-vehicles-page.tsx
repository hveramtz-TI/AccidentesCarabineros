/**
 * Vehículos tab (`/analisis/vehiculos`, EXP-04 T5).
 *
 * Presentational: the layout owns the single `/api/analysis` request and passes
 * the response through the router outlet context — this page never issues a
 * second one. Everything is derived from `vehicles`: the non-additivity
 * disclosure (always before any numbers), a compact scope summary, the full
 * type table, the type × severity matrix, and the coverage note for siniestros
 * without vehicle rows. The section is read defensively: a stale server without
 * `vehicles` shows an explicit notice instead of crashing the tab.
 */

import { useMemo } from "react"
import { useOutletContext } from "react-router"

import VehicleSeverityMatrix from "@/components/analysis/vehicle-severity-matrix"
import VehicleTypeTable from "@/components/analysis/vehicle-type-table"
import type { AnalysisVehicleTypeRow, AnalysisVehiclesSection } from "@/lib/api/analysis"
import type { AnalysisOutletContext } from "@/routes/analysis-layout"

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function VehiclesSkeleton() {
  return (
    <div role="status" aria-label="Cargando vehículos" className="flex min-w-0 flex-col gap-4">
      <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="glass-card h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="min-w-0">
        <div className="mb-3 h-4 w-56 animate-pulse rounded bg-muted" />
        <div className="glass-card rounded-lg p-4 md:p-5">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-8 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-3 h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="glass-card rounded-lg p-4 md:p-5">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-8 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalysisVehiclesPage() {
  const { data, status } = useOutletContext<AnalysisOutletContext>()

  const vehicles: AnalysisVehiclesSection | null = useMemo(
    () => data?.vehicles ?? null,
    [data],
  )

  const leadingType: AnalysisVehicleTypeRow | null = useMemo(() => {
    if (!vehicles || vehicles.totalSiniestros === 0) return null
    return vehicles.byType[0] ?? null
  }, [vehicles])

  if (!data) {
    return status === "loading" ? <VehiclesSkeleton /> : null
  }

  if (!vehicles) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        El servidor no envió la sección de vehículos del análisis. Actualiza el
        backend para habilitar esta pestaña.
      </p>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="note"
        className="rounded-lg border border-[rgba(255,178,36,0.25)] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-sm text-accent-foreground"
      >
        Un siniestro puede involucrar varios tipos de vehículo y se cuenta una
        vez en cada tipo. Por eso las participaciones no suman 100 %: en esta
        pestaña no se muestra ningún total ni acumulado de las filas de tipo.
      </div>

      <section aria-label="Resumen de vehículos del alcance" className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Siniestros en el alcance</p>
          <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
            {COUNT_FORMAT.format(vehicles.totalSiniestros)}
          </p>
        </div>

        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Tipos de vehículo presentes</p>
          <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
            {COUNT_FORMAT.format(vehicles.byType.length)}
          </p>
        </div>

        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Tipo principal</p>
          {leadingType ? (
            <>
              <p className="mt-1 text-sm font-medium leading-5 text-foreground">{leadingType.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
                {COUNT_FORMAT.format(leadingType.siniestros)} siniestros ·{" "}
                {SHARE_FORMAT.format(leadingType.share)} %
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicles.totalSiniestros > 0
                ? "Sin siniestros con vehículo registrado"
                : "Sin siniestros en el alcance"}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="analysis-vehicle-types" className="min-w-0">
        <h2
          id="analysis-vehicle-types"
          className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
        >
          Tipos de vehículo
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Todos los tipos con siniestros en el alcance, contados en siniestros
          distintos (no en filas de vehículo). La participación divide por el
          total de siniestros del alcance.
        </p>
        <VehicleTypeTable rows={vehicles.byType} />
      </section>

      <section aria-labelledby="analysis-vehicle-severity" className="min-w-0">
        <h2
          id="analysis-vehicle-severity"
          className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
        >
          Gravedad por tipo de vehículo
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Severidad a nivel de siniestro: cada siniestro cae en exactamente una
          categoría, por lo que la suma de las columnas de gravedad coincide
          con el total de la fila.
        </p>
        <VehicleSeverityMatrix
          types={vehicles.byType}
          cells={vehicles.byTypeSeverity}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        {vehicles.withoutVehicleRows > 0 ? (
          <>
            {COUNT_FORMAT.format(vehicles.withoutVehicleRows)} siniestros del
            alcance no tienen filas de vehículo; no se asigna ningún tipo.
          </>
        ) : (
          "Todos los siniestros del alcance tienen al menos una fila de vehículo."
        )}
      </p>
    </div>
  )
}
