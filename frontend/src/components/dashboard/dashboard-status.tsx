import { syntheticBanner } from "@/lib/data"

interface Props {
  synthetic: boolean
  emptyScope: boolean
}

export default function DashboardStatus({ synthetic, emptyScope }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip chip-warning" role="status">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          Synthetic demo
        </span>
        <p className="font-mono text-xs text-muted-foreground">
          {syntheticBanner.periodLabel}
        </p>
      </div>

      {synthetic === false && (
        <p className="text-xs text-destructive">
          Fixture markers missing: these values may not be safe to show as demo
          data. Verify the source before publishing.
        </p>
      )}

      {emptyScope && (
        <div
          role="status"
          className="rounded-lg border border-[rgba(255,178,36,0.25)] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-sm text-accent-foreground"
        >
          This scope has no rows in the synthetic territorial fixture (coverage
          is partial by design). Pick another commune, another region, or
          return to “All regions”.
        </div>
      )}
    </>
  )
}
