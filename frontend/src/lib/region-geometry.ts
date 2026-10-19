/**
 * Chile regions GeoJSON: asset loading, catalog join and fitted projection.
 *
 * Asset: Natural Earth admin-1 states & provinces (public domain), filtered
 * to Chile's 16 ADM1 features and simplified (see file `attribution`).
 * Join key: `properties.iso` ↔ `RegionRef.abbreviation`
 * (verified 16/16 in T1; see odd/tasks/interactive-geojson-map.md).
 *
 * Projection: conic equal-area with Chile's own standard parallels, fitted to
 * MAINLAND rings only — offshore islands (Rapa Nui, San Félix) stay in the
 * data and remain reachable through pan/zoom, but must not shrink the fit.
 */

import { geoConicEqualArea, geoCentroid, type GeoProjection } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"

import chileGeoAsset from "@/data/chile-regions.geo.json"
import { regions } from "@/lib/data"

export const MAP_WIDTH = 520
export const MAP_HEIGHT = 1440

/** Rings west of this longitude are offshore islands excluded from the fit. */
const MAINLAND_LON_MIN = -80

export interface RegionProperties {
  iso: string
  name: string
}

export const chileFeatureCollection = chileGeoAsset as unknown as FeatureCollection<Geometry, RegionProperties>

function ringMinLon(ring: number[][]): number {
  let min = Infinity
  for (const coord of ring) min = Math.min(min, coord[0])
  return min
}

/** Geometry without offshore islands; null if nothing mainland remains. */
function mainlandGeometry(geometry: Geometry): Geometry | null {
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates.filter((ring) => ringMinLon(ring) > MAINLAND_LON_MIN)
    return rings.length > 0 ? { type: "Polygon", coordinates: rings } : null
  }
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates.filter((poly) => ringMinLon(poly[0]) > MAINLAND_LON_MIN)
    return polys.length > 0 ? { type: "MultiPolygon", coordinates: polys } : null
  }
  return null
}

const mainlandForFit: FeatureCollection = {
  type: "FeatureCollection",
  features: chileFeatureCollection.features.flatMap((feature) => {
    const mainland = mainlandGeometry(feature.geometry)
    return mainland ? [{ ...feature, geometry: mainland }] : []
  }),
}

export const chileProjection: GeoProjection = geoConicEqualArea()
  .parallels([-28, -52])
  .rotate([71, 0])
  .fitExtent([[16, 16], [MAP_WIDTH - 16, MAP_HEIGHT - 16]], mainlandForFit)

/** Geographic center of the fitted view, used as ZoomableGroup center. */
export const chileMapCenter: [number, number] = (chileProjection.invert?.([MAP_WIDTH / 2, MAP_HEIGHT / 2]) ?? [
  -71,
  -38,
]) as [number, number]

export interface RegionLink {
  romanNumber: string
  number: string
  name: string
}

/** GeoJSON iso abbreviation -> catalog region (canonical display name). */
export const regionByAbbreviation = new Map<string, RegionLink>(
  regions.map((region) => [
    region.abbreviation,
    { romanNumber: region.romanNumber, number: region.number, name: region.name },
  ]),
)

/**
 * Tooltip anchor per region: centroid of the MAINLAND part projected to SVG
 * pixels (a full-feature centroid would drift into the Pacific for regions
 * with offshore islands). Unprojectable entries are dropped; the component
 * falls back to a pointer-independent fixed corner in that case.
 */
export const regionCentersPx = new Map<string, [number, number]>(
  chileFeatureCollection.features.flatMap((feature) => {
    const mainland = mainlandGeometry(feature.geometry) ?? feature.geometry
    const point = chileProjection(geoCentroid({ type: "Feature", properties: {}, geometry: mainland }))
    if (!point) return []
    return [[feature.properties.iso, [point[0], point[1]]] as [string, [number, number]]]
  }),
)

/** Count of features whose iso joins the catalog — used as a build-time guard. */
export const joinedRegionCount = chileFeatureCollection.features.filter((feature) =>
  regionByAbbreviation.has(feature.properties.iso),
).length
