/**
 * Report metadata block for `/informes` (EXP-06 T4).
 *
 * Institutional text header only — the user gate in the ODD log (L2) rules out
 * any logo or image asset. Every line is provenance the paper artifact must
 * carry: period, scope, source, and the server generation timestamp rendered
 * with `Intl` in es-CL.
 */

import type { DashboardApiResponse } from "@/types/dashboard-api"

interface Props {
  meta: DashboardApiResponse["meta"]
  /** Spanish scope label (the adapter already localizes the national case). */
  scopeLabel: string
}

const dateFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "long" })
const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "long",
  timeStyle: "short",
})

/** ISO calendar date read as a local date, so no timezone shifts the day. */
function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormatter.format(date)
}

export default function ReportHeader({ meta, scopeLabel }: Props) {
  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Período",
      value: `${formatIsoDate(meta.period.from)} → ${formatIsoDate(meta.period.to)}`,
    },
    { label: "Alcance", value: scopeLabel },
    {
      label: "Fuente",
      value: "Datos oficiales publicados por Carabineros de Chile para 2025",
    },
    { label: "Generado", value: formatGeneratedAt(meta.generatedAt) },
  ]

  return (
    <dl className="grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="metric-label">{row.label}</dt>
          <dd className="mt-1 text-sm leading-6 text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
