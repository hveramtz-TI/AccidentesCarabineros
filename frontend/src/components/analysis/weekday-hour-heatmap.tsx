/**
 * Weekday × 3-hour heatmap (EXP-07 T6). The matrix IS a `<table>`: rows are
 * the seven ISO weekdays (Monday first), columns the eight 3-hour buckets,
 * every cell prints its count, and a subtle `--primary` shading layer encodes
 * intensity WITHOUT being the only channel (black and white stays readable).
 * Row/column totals and the grand total are derived from the 56 cells and the
 * grand total is asserted against the scope — the disclosure for the exact
 * `00:00:00` artifact rows sits under the table, as approved.
 */

import type { AnalysisWeekdayHoursSection } from "@/lib/api/analysis"

interface Props {
  weekdayHours: AnalysisWeekdayHoursSection
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
}

const BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21] as const

function bucketLabel(start: number): string {
  const end = start + 3
  return `${String(start).padStart(2, "0")}–${String(end).padStart(2, "0")}`
}

/**
 * Five visual levels from the cell's ratio to the hottest cell (0 stays
 * unshaded). Shading is decorative — the printed number carries the value.
 */
function shadeLevel(accidents: number, max: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (max === 0 || accidents === 0) return 0
  const ratio = accidents / max
  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.6) return 3
  if (ratio <= 0.8) return 4
  return 5
}

export default function WeekdayHourHeatmap({ weekdayHours }: Props) {
  const max = Math.max(0, ...weekdayHours.cells.map((cell) => cell.accidents))

  const cellOf = (weekday: number, bucket: number): number =>
    weekdayHours.cells.find((cell) => cell.weekday === weekday && cell.bucket === bucket)?.accidents ?? 0

  const dayTotal = (weekday: number): number =>
    BUCKETS.reduce<number>((sum, bucket) => sum + cellOf(weekday, bucket), 0)
  const bucketTotal = (bucket: number): number =>
    [1, 2, 3, 4, 5, 6, 7].reduce((sum, weekday) => sum + cellOf(weekday, bucket), 0)

  return (
    <section aria-label="Mapa de calor por día y franja horaria" className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <h2 className="text-base font-semibold text-foreground">Día de la semana × franja horaria</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Siniestros por día (la semana empieza en lunes) y franja de 3 horas:{" "}
        {COUNT_FORMAT.format(weekdayHours.totalAccidents)} en el alcance. De
        ellos, {COUNT_FORMAT.format(weekdayHours.midnightArtifactCount)} tienen
        hora exacta 00:00:00 — probable artefacto de hora faltante en el origen;
        permanecen en su franja 00–03 y no se reasignan.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <caption className="sr-only">
            Cuenta de siniestros para cada combinación de día de la semana y
            franja de 3 horas, con totales por día, por franja y total general.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-1.5 text-left font-normal text-muted-foreground">Día</th>
              {BUCKETS.map((bucket) => (
                <th key={bucket} scope="col" className="p-1.5 text-center font-normal text-muted-foreground">
                  {bucketLabel(bucket)}
                </th>
              ))}
              <th scope="col" className="p-1.5 text-right font-normal text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
              <tr key={weekday} className="border-t border-border/40">
                <th scope="row" className="p-1.5 text-left font-medium text-foreground">
                  {WEEKDAY_LABELS[weekday]}
                </th>
                {BUCKETS.map((bucket) => {
                  const accidents = cellOf(weekday, bucket)
                  const level = shadeLevel(accidents, max)
                  return (
                    <td
                      key={bucket}
                      className={`heatmap-cell rounded-sm p-1.5 text-center font-mono tabular-nums text-foreground heatmap-level-${level}`}
                      aria-label={`${WEEKDAY_LABELS[weekday]} ${bucketLabel(bucket)}: ${COUNT_FORMAT.format(accidents)} siniestros`}
                    >
                      {COUNT_FORMAT.format(accidents)}
                    </td>
                  )
                })}
                <td className="p-1.5 text-right font-mono tabular-nums text-foreground">
                  {COUNT_FORMAT.format(dayTotal(weekday))}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border/70">
              <th scope="row" className="p-1.5 text-left font-medium text-foreground">Total</th>
              {BUCKETS.map((bucket) => (
                <td key={bucket} className="p-1.5 text-center font-mono tabular-nums text-foreground">
                  {COUNT_FORMAT.format(bucketTotal(bucket))}
                </td>
              ))}
              <td className="p-1.5 text-right font-mono tabular-nums font-semibold text-foreground">
                {COUNT_FORMAT.format(weekdayHours.totalAccidents)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
