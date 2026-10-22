import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"

import type { NavigationItem } from "./Header"

interface Props {
  navigation: NavigationItem[]
}

const ICON_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export default function HamburgerMenu({ navigation }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const ToggleIcon = isOpen ? X : Menu

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return

      setIsOpen(false)
      triggerRef.current?.focus()
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return

      setIsOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className="w-full">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="truncate font-heading text-sm font-semibold leading-tight text-foreground">
          Siniestros viales de Chile
        </h1>
        <button
          ref={triggerRef}
          type="button"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((open) => !open)}
          className={ICON_BUTTON_CLASS}
        >
          <ToggleIcon aria-hidden="true" size={20} />
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Navegación principal"
        hidden={!isOpen}
        className={`glass-card absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto p-2 shadow-2xl ${
          isOpen ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2" : ""
        }`}
      >
        <ul className="divide-y divide-border">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.label}>
                {item.active ? (
                  <a
                    href="/"
                    aria-current="page"
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-12 items-center gap-3 py-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon aria-hidden="true" size={18} />
                    {item.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex min-h-12 w-full items-center gap-3 py-3 text-left text-sm font-medium "
                  >
                    <Icon aria-hidden="true" size={18} />
                    {item.label}
                    <span className="ml-auto text-xs text-muted-foreground">
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
  )
}
