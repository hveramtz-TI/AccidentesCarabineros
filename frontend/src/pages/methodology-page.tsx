/**
 * Metodología page (`/metodologia`, EXP-01 T4).
 *
 * Explains source, coverage, universe, approved definitions, quality, caveats,
 * and version. Every number comes from GET /api/meta — the page hard-codes no
 * counts and has no synthetic fallback, so it cannot drift from the database.
 * Footer-only section: it is intentionally absent from the main header.
 */

import type { ReactNode } from "react"

import DashboardStatus from "@/components/dashboard/dashboard-status"
import { useMetaQuery } from "@/hooks/use-meta-query"
import { pageTitle, usePageEffects } from "@/hooks/use-page-effects"

const DATE_FORMAT = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" })
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatCount(value: number): string {
  return value.toLocaleString("es-CL")
}

function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso))
}

function formatDateTime(iso: string): string {
  return DATE_TIME_FORMAT.format(new Date(iso))
}

interface SectionCardProps {
  id: string
  title: string
  children: ReactNode
}

function SectionCard({ id, title, children }: SectionCardProps) {
  return (
    <section aria-labelledby={id} className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <h2 id={id} className="mb-3 font-heading text-base font-semibold text-foreground">
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

function MethodologySkeleton() {
  return (
    <div role="status" aria-label="Cargando metodología" className="grid gap-4 lg:grid-cols-2">
      {["Fuente", "Cobertura", "Universo", "Definiciones", "Calidad del dato", "Caveats", "Versionado"].map(
        (title) => (
          <div key={title} className="glass-card rounded-lg p-4 md:p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ),
      )}
    </div>
  )
}

export default function MethodologyPage() {
  usePageEffects(pageTitle("Metodología"))

  const meta = useMetaQuery()
  const data = meta.data

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <section aria-labelledby="metodologia-title" className="min-w-0">
        <h1
          id="metodologia-title"
          data-page-heading
          tabIndex={-1}
          className="mb-3 border-b border-border/70 pb-3 font-heading text-lg font-semibold text-foreground outline-none"
        >
          Metodología y calidad del dato
        </h1>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">
          Cómo se construye el panel de siniestros viales de Chile 2025: fuente,
          cobertura, universo de registros, definiciones aprobadas, calidad del
          dato y limitaciones que acompañan a cada indicador.
        </p>
      </section>

      <DashboardStatus
        status={meta.status}
        error={meta.error}
        emptyScope={false}
        onRetry={meta.retry}
        subject="de metodología"
      />

      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard id="metodologia-fuente" title="Fuente">
            <p>
              Datos oficiales publicados por Carabineros de Chile para 2025,
              normalizados en una base PostgreSQL.
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Identificador: {data.source}
            </p>
            <p>El conjunto no contiene datos sintéticos.</p>
          </SectionCard>

          <SectionCard id="metodologia-cobertura" title="Cobertura">
            <p>
              El conjunto cubre desde el {formatDate(data.coverage.from)} hasta el{" "}
              {formatDate(data.coverage.to)}.
            </p>
            <p>
              Solo existe el año 2025; no hay comparaciones con otros años ni
              lenguaje de variación interanual.
            </p>
          </SectionCard>

          <SectionCard id="metodologia-universo" title="Universo">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="metric-label">Siniestros</dt>
                <dd className="metric-value text-xl font-semibold text-foreground">
                  {formatCount(data.rowCounts.siniestros)}
                </dd>
              </div>
              <div>
                <dt className="metric-label">Personas</dt>
                <dd className="metric-value text-xl font-semibold text-foreground">
                  {formatCount(data.rowCounts.personas)}
                </dd>
              </div>
              <div>
                <dt className="metric-label">Vehículos</dt>
                <dd className="metric-value text-xl font-semibold text-foreground">
                  {formatCount(data.rowCounts.vehiculos)}
                </dd>
              </div>
            </dl>
            <p>
              Las filas de personas son un grano distinto del de siniestros: no
              se suman entre sí ni comparten un mismo eje.
            </p>
          </SectionCard>

          <SectionCard id="metodologia-definiciones" title="Definiciones">
            <dl className="space-y-2">
              <div>
                <dt className="font-medium text-foreground">Accidentes</dt>
                <dd>Conteo de siniestros registrados.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Fallecidos</dt>
                <dd>Suma de fallecidos por siniestro.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Lesionados</dt>
                <dd>
                  Suma de lesionados graves, menos graves y leves por siniestro.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Lesionados graves</dt>
                <dd>Suma de lesionados graves por siniestro.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Severidad</dt>
                <dd>
                  Cada siniestro cae en un solo bucket: fatal, grave, leve o solo
                  ilesos.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Participaciones</dt>
                <dd>
                  Porcentaje sobre los siniestros filtrados; en vehículos el
                  denominador son siniestros, no filas.
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard id="metodologia-calidad" title="Calidad del dato">
            <p>Las cifras son agregadas y no muestran datos personales.</p>
            <p>
              La edad faltante no se imputa: se muestra como una banda propia
              «sin dato».
            </p>
            <p>
              El sexo «se ignora» se mantiene como categoría propia, nunca se
              reasigna.
            </p>
            <p>
              La hora exacta 00:00:00 no se reasigna: se informa como artefacto
              dentro de la franja 00–03.
            </p>
          </SectionCard>

          <SectionCard id="metodologia-caveats" title="Caveats">
            <ol className="list-decimal space-y-2 pl-5">
              {data.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard id="metodologia-versionado" title="Versionado">
            <dl className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
                <dt>Versión del esquema</dt>
                <dd className="font-mono text-xs text-foreground">{data.schemaVersion}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
                <dt>Generado</dt>
                <dd className="font-mono text-xs text-foreground">
                  {formatDateTime(data.generatedAt)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Fuente</dt>
                <dd className="font-mono text-xs text-foreground">{data.source}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      ) : meta.status === "error" ? null : (
        <MethodologySkeleton />
      )}
    </div>
  )
}
