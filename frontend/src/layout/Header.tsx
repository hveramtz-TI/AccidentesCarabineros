import type { LucideIcon } from "lucide-react"
import { Activity } from "lucide-react"

export interface NavigationItem {
  label: string
  icon: LucideIcon
  active: boolean
}

interface Props {
  navigation: NavigationItem[]
}

const Header = ({ navigation }: Props) => {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-10">
      <div className="glass-card mx-auto w-auto border-border p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <Activity size={18} />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <h1 className="truncate font-heading text-sm font-semibold leading-tight text-foreground">
                Siniestros viales de Chile
              </h1>
              <span className="metric-label truncate">
                Análisis de siniestros viales
              </span>
            </div>
          </div>

          <nav
            aria-label="Navegación principal"
            className="order-3 w-full min-w-0 lg:order-none lg:w-auto lg:flex-1"
          >
            <ul className="grid w-full grid-cols-3 items-stretch gap-1 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
              {navigation.map((item) => {
                const Icon = item.icon
                const className =
                  "inline-flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-auto lg:flex-row lg:gap-2 lg:px-3"

                return (
                  <li key={item.label} className="min-w-0">
                    {item.active ? (
                      <a
                        href="/"
                        aria-current="page"
                        className={`${className} bg-primary/10 text-primary hover:bg-primary/15`}
                      >
                        <Icon aria-hidden="true" size={16} />
                        {item.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className={`${className} cursor-not-allowed text-muted-foreground/60`}
                      >
                        <Icon aria-hidden="true" size={16} />
                        {item.label}
                        <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground lg:text-xs">
                          (Próximamente)
                        </span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
