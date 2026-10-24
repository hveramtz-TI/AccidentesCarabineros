/**
 * Application shell (EXP-00 T2, EXP-02 T4).
 *
 * The floating header, the dot-grid main, and the footer stay exactly where the
 * Panel had them; only the body became a routed `<Outlet />`. One Suspense
 * fallback and one route error boundary wrap it, so a lazy chunk or a failing
 * page can never blank the shell, and the boundary is keyed by pathname so
 * navigating always clears the previous failure.
 */

import { Suspense } from "react"
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
import RouteFallback from "@/routes/route-fallback"

/**
 * Navigation is the single place that knows which sections exist. Later ODDs
 * enable their own item and register their own route: EXP-03 flips Análisis,
 * EXP-06 flips Informes. Metodología stays out of the header (EXP-01 puts it in
 * the footer).
 */
const NAV_ITEMS: NavigationItem[] = [
  { label: "Panel", icon: LayoutDashboard, to: "/", enabled: true },
  { label: "Mapas", icon: Map, to: "/mapas", enabled: true },
  { label: "Análisis", icon: ScanSearch, to: "/analisis", enabled: true },
  { label: "Informes", icon: FileChartColumn, to: "/informes", enabled: true },
]

/** Sections whose content is driven by the URL filters (EXP-03, EXP-06). */
const FILTER_CARRY_PATHS = new Set(["/analisis", "/informes"])

const Layout = () => {
  const location = useLocation()
  // Switching into the analysis or reports area keeps the active
  // period/territory filters.
  const navigation = NAV_ITEMS.map((item) =>
    typeof item.to === "string" && FILTER_CARRY_PATHS.has(item.to)
      ? { ...item, to: { pathname: item.to, search: location.search } }
      : item,
  )

  return (
    // print:min-h-0 so the svh floor never adds a blank sheet on paper (EXP-06 T5).
    <div className="flex min-h-svh min-w-0 flex-col print:min-h-0">
      <Header navigation={navigation} />
      <main className="dot-grid min-w-0 flex-1">
        <RouteErrorBoundary key={location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default Layout
