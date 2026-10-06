import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  FileChartColumn,
  LayoutDashboard,
  Map,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import Footer from "./Footer"
import Header from "./Header"

interface Props {
  children: ReactNode
  /** Passed through to the Header (dashboard filters). */
  toolbar?: ReactNode
}

interface NavItem {
  label: string
  icon: LucideIcon
  active: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Maps", icon: Map, active: false },
  { label: "Reports", icon: FileChartColumn, active: false },
]

const Layout = ({ children, toolbar }: Props) => {
  return (
    <TooltipProvider>
      <SidebarProvider className="min-h-svh">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 text-sidebar-foreground">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
              >
                <Activity size={16} />
              </span>
              <span className="font-heading text-sm font-semibold leading-tight group-data-[collapsible=icon]:hidden">
                Accidente
                <span className="block metric-label font-normal">
                  Telemetry Console
                </span>
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="metric-label font-mono">
                Telemetry
              </SidebarGroupLabel>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={item.active}
                        tooltip={item.label}
                        disabled={!item.active}
                        aria-disabled={!item.active}
                      >
                        <Icon aria-hidden="true" />
                        <span>
                          {item.label}
                          {!item.active && (
                            <span className="sr-only"> (coming soon)</span>
                          )}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="min-w-0">
          <Header toolbar={toolbar} />
          <main className="dot-grid min-w-0 flex-1">{children}</main>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default Layout
