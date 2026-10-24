/**
 * Per-route metadata and navigation effects (SEO Phase 1, T6/T8).
 *
 * `frontend/src/data/route-meta.json` is the single source of truth for the
 * title, description, canonical, and OG/Twitter fields. The build step
 * (`scripts/seo-build.mjs`) bakes the same values into each static HTML file;
 * this hook only keeps them correct during client-side navigation.
 *
 * It also owns the navigation behaviour the pages had before: restoring the
 * scroll position on back-navigation and moving focus to the element marked
 * `data-page-heading` on a real navigation. It keys on `pathname` only, because
 * changing a filter rewrites the search string and must not jump the viewport.
 */

import { useEffect } from "react"
import { useLocation } from "react-router"

import routeMeta from "@/data/route-meta.json"

export type RouteMetaKey = keyof typeof routeMeta.routes

export interface PageMetaOptions {
  /**
   * Filtered dashboard views are canonicalised to the clean path and kept out
   * of the index: the same data is reachable through many query strings.
   */
  filtered?: boolean
}

function setMetaContent(attribute: "name" | "property", key: string, content: string): void {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attribute, key)
    document.head.append(element)
  }

  element.setAttribute("content", content)
}

function setCanonical(href: string | null): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (href === null) {
    existing?.remove()
    return
  }

  const link = existing ?? document.createElement("link")
  if (!existing) {
    link.rel = "canonical"
    document.head.append(link)
  }

  link.href = href
}

const scrollPositions = new Map<string, number>()

// The first render is the browser opening the page, not a navigation: nothing
// should be scrolled or focused yet.
let firstNavigation = true

export function usePageMeta(
  routeKey: RouteMetaKey,
  options: PageMetaOptions = {},
): void {
  const { pathname } = useLocation()
  const { filtered = false } = options
  const route = routeMeta.routes[routeKey]

  useEffect(() => {
    const canonical = route.path ? `${routeMeta.origin}${route.path}` : null
    const robots = route.noindex || filtered ? "noindex, follow" : "index, follow"

    document.title = route.title
    setMetaContent("name", "description", route.description)
    setMetaContent("name", "robots", robots)
    setMetaContent("property", "og:type", "website")
    setMetaContent("property", "og:site_name", routeMeta.siteName)
    setMetaContent("property", "og:locale", "es_CL")
    setMetaContent("property", "og:title", route.title)
    setMetaContent("property", "og:description", route.description)
    setMetaContent("name", "twitter:card", "summary")
    setMetaContent("name", "twitter:title", route.title)
    setMetaContent("name", "twitter:description", route.description)
    setCanonical(canonical)

    if (canonical) {
      setMetaContent("property", "og:url", canonical)
    } else {
      document.head.querySelector('meta[property="og:url"]')?.remove()
    }
  }, [route, filtered])

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
