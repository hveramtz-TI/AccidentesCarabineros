import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Activity } from "lucide-react"

export interface NavigationItem {
  label: string
  icon: LucideIcon
  active: boolean
}

interface Props {
  /** Optional toolbar rendered at the end of the header (e.g. dashboard filters). */
  toolbar?: ReactNode
  navigation: NavigationItem[]
}

const Header = ({ toolbar, navigation }: Props) => {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass-card mx-auto max-w-[1600px] border-border p-3 sm:p-4">
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
                Traffic Accident Telemetry
              </h1>
              <span className="metric-label truncate">
                Carabineros de Chile road-safety analytics
              </span>
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1"
          >
            <ul className="flex flex-wrap items-center justify-center gap-1 sm:justify-end md:justify-center">
              {navigation.map((item) => {
                const Icon = item.icon
                const className =
                  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

                return (
                  <li key={item.label}>
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
                        <span className="sr-only"> (coming soon)</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {toolbar ? (
          <div className="mt-3 min-w-0 border-t border-border/70 pt-3 [&>form]:w-full [&>form]:justify-start [&>form>div]:min-w-0 [&>form>div]:max-w-full [&>form>div]:flex-[1_1_9rem] md:[&>form]:justify-end sm:[&>form>div]:flex-[0_1_11rem]">
            {toolbar}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export default Header
