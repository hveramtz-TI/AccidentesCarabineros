import type { LucideIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import CollaborationMark from "./CollaborationMark"
import HamburgerMenu from "./HamburgerMenu"

export interface NavigationItem {
  label: string
  icon: LucideIcon
  active: boolean
}

interface Props {
  navigation: NavigationItem[]
}

const NAV_ITEM_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const Header = ({ navigation }: Props) => {
  const isMobile = useIsMobile()

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-10">
      <div className="glass-card relative mx-auto w-auto border-border p-3 sm:p-4">
        {isMobile ? (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex justify-center">
              <CollaborationMark />
            </div>
            <HamburgerMenu navigation={navigation} />
          </div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <CollaborationMark />
              <div className="flex min-w-0 flex-col justify-center">
                <h1 className="truncate font-heading text-sm font-semibold leading-tight text-foreground">
                  Siniestros viales de Chile
                </h1>
                <span className="metric-label truncate">
                  Análisis de siniestros viales
                </span>
              </div>
            </div>

            <nav aria-label="Navegación principal" className="min-w-0 flex-1">
              <ul className="flex flex-wrap items-stretch justify-end gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon

                  return (
                    <li key={item.label} className="min-w-0">
                      {item.active ? (
                        <a
                          href="/"
                          aria-current="page"
                          className={`${NAV_ITEM_CLASS} bg-primary/10 text-primary hover:bg-primary/15`}
                        >
                          <Icon aria-hidden="true" size={16} />
                          {item.label}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className={`${NAV_ITEM_CLASS} cursor-not-allowed text-muted-foreground/60`}
                        >
                          <Icon aria-hidden="true" size={16} />
                          {item.label}
                          <span className="whitespace-nowrap text-xs leading-none text-muted-foreground">
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
        )}
      </div>
    </header>
  )
}

export default Header
