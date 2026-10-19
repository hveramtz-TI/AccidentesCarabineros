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
            Recursos institucionales
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
            Fuente y alcance
          </h2>
          <p className="max-w-prose text-sm leading-6 text-muted-foreground">
            Fuente: datos oficiales publicados por Carabineros de Chile para
            2025. Este tablero presenta cifras agregadas y no muestra datos
            personales.
          </p>
          <p className="max-w-prose text-xs leading-5 text-muted-foreground">
            La visualización no implica respaldo institucional de Carabineros
            de Chile.
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
              Siniestros viales de Chile
            </p>
            <p className="metric-label">Datos agregados · período 2025</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>AccidentesCarabineros · Análisis de siniestros viales</span>
          <span className="font-mono tabular-nums">Versión 0.1</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
