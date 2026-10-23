/**
 * Application shell (EXP-00 T2).
 *
 * The floating header, the dot-grid main, and the footer stay exactly where the
 * Panel had them; only the body becomes a routed `<Outlet />`. A route error
 * boundary wraps the outlet so one failing page cannot blank the shell, and it
 * is keyed by pathname so navigating always clears the previous failure.
 */

import { Outlet, useLocation } from "react-router"
import {
  FileChartColumn,
  LayoutDashboard,
  Map,
  ScanSearch,
} from "lucide-react"
import Footer from "./Footer"
import Header from "./Header"
import type { NavigationItem } from "./Header"
import RouteErrorBoundary from "@/routes/route-error-boundary"

/**
 * Navigation is the single place that knows which sections exist. Later ODDs
 * enable their own item and register their own route: EXP-02 flips Mapas,
 * EXP-03 flips Análisis, EXP-06 flips Informes. Metodología stays out of the
 * header (EXP-01 puts it in the footer).
 */
const NAV_ITEMS: NavigationItem[] = [
  { label: "Panel", icon: LayoutDashboard, to: "/", enabled: true },
  { label: "Mapas", icon: Map, to: "/mapas", enabled: false },
  { label: "Análisis", icon: ScanSearch, to: "/analisis", enabled: false },
  { label: "Informes", icon: FileChartColumn, to: "/informes", enabled: false },
]

const Layout = () => {
  const location = useLocation()

  return (
    <div className="flex min-h-svh min-w-0 flex-col">
      <Header navigation={NAV_ITEMS} />
      <main className="dot-grid min-w-0 flex-1">
        <RouteErrorBoundary key={location.pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default Layout
