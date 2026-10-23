/**
 * Per-page route effects (EXP-00 T4).
 *
 * Every page calls this once. It owns the document title, restores the scroll
 * position when the user returns to a path they already read, and moves focus to
 * the element marked `data-page-heading` on a real navigation.
 *
 * It keys on `pathname` only: changing a filter rewrites the search string and
 * must never jump the viewport or steal focus.
 */

import { useEffect } from "react"
import { useLocation } from "react-router"

const APP_TITLE = "Siniestros viales de Chile | AccidentesCarabineros"

/** Panel keeps the original document title; later sections prefix their name. */
export function pageTitle(section?: string): string {
  return section ? `${section} · ${APP_TITLE}` : APP_TITLE
}

const scrollPositions = new Map<string, number>()

// The first render is the browser opening the page, not a navigation: nothing
// should be scrolled or focused yet.
let firstNavigation = true

export function usePageEffects(title: string) {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    const remembered = scrollPositions.get(pathname)

    if (firstNavigation) {
      firstNavigation = false
    } else if (remembered !== undefined) {
      window.scrollTo({ top: remembered, behavior: "instant" as ScrollBehavior })
    } else {
      document.querySelector<HTMLElement>("[data-page-heading]")?.focus({ preventScroll: true })
    }

    return () => {
      scrollPositions.set(pathname, window.scrollY)
    }
  }, [pathname])
}
