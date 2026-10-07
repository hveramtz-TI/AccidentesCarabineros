import type { ReactNode } from "react"
import {
  FileChartColumn,
  LayoutDashboard,
  Map,
} from "lucide-react"
import Footer from "./Footer"
import Header from "./Header"
import type { NavigationItem } from "./Header"

interface Props {
  children: ReactNode
  /** Passed through to the Header (dashboard filters). */
  toolbar?: ReactNode
}

const NAV_ITEMS: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Maps", icon: Map, active: false },
  { label: "Reports", icon: FileChartColumn, active: false },
]

const Layout = ({ children, toolbar }: Props) => {
  return (
    <div className="flex min-h-svh min-w-0 flex-col">
      <Header toolbar={toolbar} navigation={NAV_ITEMS} />
      <main className="dot-grid min-w-0 flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default Layout
