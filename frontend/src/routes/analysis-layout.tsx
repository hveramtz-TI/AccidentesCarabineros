/**
 * Análisis shell (EXP-03 T4).
 *
 * Owns the single `/api/analysis` query and the URL-backed filter bar, then
 * shares `{ data, status, error, retry }` with the active tab through the router
 * outlet context. Tab pages stay presentational: switching tabs issues no new
 * request because the query key depends only on the four filter params.
 */

import { useMemo } from "react"
import { NavLink, Outlet, useLocation } from "react-router"

import DashboardFiltersBar from "@/components/dashboard/dashboard-filters"
import DashboardStatus from "@/components/dashboard/dashboard-status"
import { useAnalysisQuery } from "@/hooks/use-analysis-query"
import { pageTitle, usePageEffects } from "@/hooks/use-page-effects"
import { useUrlFilters } from "@/hooks/use-url-filters"
import type { AnalysisApiResponse } from "@/lib/api/analysis"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import { periodOptions, regions } from "@/lib/data"
import { ALL_VALUE } from "@/types/dashboard"

export interface AnalysisOutletContext {
  data: AnalysisApiResponse | null
  status: "loading" | "success" | "error"
  error: string | null
  retry: () => void
}

interface AnalysisTab {
  label: string
  to: string
  enabled: boolean
}

/** Causas (EXP-03), Vehículos (EXP-04), Personas (EXP-05) and Tendencias (EXP-07) are all live. */
const ANALYSIS_TABS: AnalysisTab[] = [
  { label: "Personas", to: "personas", enabled: true },
  { label: "Vehículos", to: "vehiculos", enabled: true },
  { label: "Causas", to: "causas", enabled: true },
  { label: "Tendencias", to: "tendencias", enabled: true },
]

const TAB_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const TAB_ACTIVE = "border-primary/40 bg-primary/10 text-primary"
const TAB_INACTIVE = "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
const TAB_DISABLED = "cursor-not-allowed border-border/60 text-muted-foreground/60"

function scopeLabel(region: string, commune: string): string {
  if (commune !== ALL_VALUE) {
    for (const entry of regions) {
      const match = entry.communes.find((candidate) => candidate.identifier === commune)
      if (match) return `${match.name} (${commune}) · ${entry.romanNumber}`
    }
  }
  if (region !== ALL_VALUE) {
    const entry = regions.find((candidate) => candidate.romanNumber === region)
    if (entry) return `${entry.romanNumber} — ${entry.name}`
  }
  return "Todas las regiones"
}

export default function AnalysisLayout() {
  usePageEffects(pageTitle("Análisis"))

  const location = useLocation()
  const [filters, setFilters] = useUrlFilters()
  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useAnalysisQuery(params)
  const data = query.data

  const periodLabel =
    periodOptions.find((option) => option.value === filters.period)?.label ?? "Año completo"
  const scope = scopeLabel(filters.region, filters.commune)
  const total = data?.causes.totalAccidents

  const outletContext = useMemo<AnalysisOutletContext>(
    () => ({
      data: query.data,
      status: query.status,
      error: query.error,
      retry: query.retry,
    }),
    [query.data, query.status, query.error, query.retry],
  )

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <header className="min-w-0">
        <h1
          id="analisis-title"
          data-page-heading
          tabIndex={-1}
          className="mb-3 border-b border-border/70 pb-3 font-heading text-lg font-semibold text-foreground outline-none"
        >
          Análisis de siniestros
        </h1>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">
          Detalle completo de las causas, los tipos de vehículo y las personas
          involucradas en los siniestros viales del alcance seleccionado,
          incluida la cola larga que no aparece en el Top 10.
        </p>
      </header>

      <section aria-label="Filtros del análisis" className="glass-card p-4">
        <DashboardFiltersBar filters={filters} onChange={setFilters} />
      </section>

      <section
        aria-label="Alcance del análisis"
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
      >
        <p className="metric-label">Alcance</p>
        <p className="text-sm text-foreground">
          {scope} · {periodLabel}
          {total !== undefined ? (
            <>
              {" · "}
              <span className="font-mono tabular-nums">{total.toLocaleString("es-CL")}</span>{" "}
              siniestros
            </>
          ) : null}
        </p>
      </section>

      <DashboardStatus
        status={query.status}
        error={query.error}
        emptyScope={data ? data.causes.totalAccidents === 0 : false}
        onRetry={query.retry}
        subject="de análisis"
      />

      <nav aria-label="Secciones de análisis">
        <ul className="flex flex-wrap gap-2">
          {ANALYSIS_TABS.map((tab) => (
            <li key={tab.label}>
              {tab.enabled ? (
                <NavLink
                  to={{ pathname: tab.to, search: location.search }}
                  className={({ isActive }) =>
                    `${TAB_CLASS} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`
                  }
                >
                  {tab.label}
                </NavLink>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={`${TAB_CLASS} ${TAB_DISABLED}`}
                >
                  {tab.label}
                  <span className="whitespace-nowrap text-xs leading-none">
                    (Próximamente)
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={outletContext} />
    </div>
  )
}
