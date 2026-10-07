import { Minus, Plus } from "lucide-react"

/**
 * Reserved map workspace for the map-first dashboard.
 *
 * Placeholder slice only: a deliberately white, empty canvas with inert zoom
 * affordances. There is no GeoJSON, no map library, no pan/zoom behavior, and
 * nothing here implies territorial data is present. When the real Chile
 * vector map lands, it replaces this component without changing dashboard
 * composition (see frontend/DASHBOARD-REDESIGN-PLAN.md).
 */

const ZOOM_BUTTON_CLASS =
  "flex min-h-11 min-w-11 cursor-not-allowed items-center justify-center rounded-md border border-black/15 bg-white text-neutral-500 shadow-sm"

export default function MapPlaceholder() {
  return (
    <section
      aria-label="Map workspace placeholder. The interactive territorial map is not available yet; this canvas is intentionally blank."
      className="relative min-h-[300px] overflow-hidden rounded-lg bg-white"
    >
      {/* Upper-left zoom affordances: visible, accessible, and non-functional. */}
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Zoom in (map not available yet)"
          className={ZOOM_BUTTON_CLASS}
        >
          <Plus aria-hidden="true" size={20} />
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Zoom out (map not available yet)"
          className={ZOOM_BUTTON_CLASS}
        >
          <Minus aria-hidden="true" size={20} />
        </button>
      </div>
    </section>
  )
}
