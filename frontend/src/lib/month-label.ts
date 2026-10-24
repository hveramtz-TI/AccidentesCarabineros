/**
 * Shared es-CL month-label formatting for the EXP-07 time series (trend bars
 * and the comparator sparklines). `YYYY-MM` is read as a LOCAL first-of-month
 * date so no timezone shift can move the day, and trailing dots from
 * `toLocaleDateString` are dropped for the compact labels.
 */

const shortFormatter = new Intl.DateTimeFormat("es-CL", { month: "short" })

export function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number)
  if (!year || !index) return month
  const date = new Date(year, index - 1, 1)
  if (Number.isNaN(date.getTime())) return month
  return shortFormatter.format(date).replace(/\.$/, "")
}
