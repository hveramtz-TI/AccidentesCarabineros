import { ArrowUpRight } from "lucide-react"
import { Link, useLocation } from "react-router"
import gobiernoLogo from "@/assets/LogoGobierno de Chile.svg"
import CollaborationMark from "./CollaborationMark"

/**
 * Footer section links (EXP-06 follow-up). The set mirrors the header nav;
 * `/analisis` and `/informes` carry the active URL filters exactly like
 * `Layout.tsx` does, so a filtered view never silently resets on the user.
 */
const SECTION_LINKS: Array<{ label: string; to: string; carryFilters: boolean }> = [
  { label: "Panel", to: "/", carryFilters: false },
  { label: "Mapas", to: "/mapas", carryFilters: false },
  { label: "Análisis", to: "/analisis", carryFilters: true },
  { label: "Informes", to: "/informes", carryFilters: true },
]

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"

const Footer = () => {
  const location = useLocation()

  return (
    <footer className="mt-8 shrink-0 border-t border-border bg-card/75">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] lg:px-8">
        <section aria-labelledby="footer-resources-title" className="space-y-3">
          <h2
            id="footer-resources-title"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Recursos institucionales
          </h2>
          <a
            href="https://www.carabineros.cl/"
            className={LINK_CLASS}
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
          <Link to="/metodologia" className={LINK_CLASS}>
            Metodología
          </Link>
        </section>

        <section aria-labelledby="footer-navigation-title" className="space-y-3">
          <h2
            id="footer-navigation-title"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Navegación
          </h2>
          <nav aria-label="Secciones del análisis" className="flex flex-col items-start">
            {SECTION_LINKS.map((link) => (
              <Link
                key={link.label}
                to={
                  link.carryFilters && location.search
                    ? { pathname: link.to, search: location.search }
                    : link.to
                }
                className={LINK_CLASS}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="flex items-center gap-3 lg:justify-self-end">
          <CollaborationMark compact />
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              Siniestros viales de Chile
            </p>
            <p className="metric-label">Datos agregados · período 2025</p>
          </div>
          <span aria-hidden="true" className="h-8 w-px bg-border" />
          <img
            src={gobiernoLogo}
            alt="Gobierno de Chile"
            className="h-9 w-auto shrink-0 object-contain"
          />
        </div>
      </div>

      <div className="border-t border-border/70 bg-background/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>AccidentesCarabineros · Análisis de siniestros viales</span>
          <span className="font-mono tabular-nums">Versión 1.0</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
