import { Activity, ArrowUpRight } from "lucide-react"

const Footer = () => {
  return (
    <footer className="mt-8 shrink-0 border-t border-border bg-card/75">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] lg:px-8">
        <section aria-labelledby="footer-resources-title" className="space-y-3">
          <h2
            id="footer-resources-title"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Institutional resources
          </h2>
          <a
            href="https://www.carabineros.cl/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Carabineros de Chile
            <ArrowUpRight aria-hidden="true" size={14} />
          </a>
        </section>

        <section aria-labelledby="footer-data-title" className="space-y-3">
          <h2
            id="footer-data-title"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Data and scope
          </h2>
          <p className="max-w-prose text-sm leading-6 text-muted-foreground">
            Aggregate road-safety analytics for demonstration. No personal data
            is shown.
          </p>
          <p className="chip chip-warning w-fit" role="status">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-current"
            />
            Synthetic example data — not official statistics
          </p>
        </section>

        <div className="flex items-center gap-3 lg:justify-self-end">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <Activity size={18} />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              Traffic Accident Telemetry
            </p>
            <p className="metric-label">Carabineros de Chile</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>AccidentesCarabineros · Road-safety analytics</span>
          <span className="font-mono tabular-nums">Obsidian Telemetry · build 0.1</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
