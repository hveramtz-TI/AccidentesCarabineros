/**
 * Catalog option builders for the dashboard filters.
 *
 * The territorial catalog (oversio-identifiers.json) is the canonical,
 * non-duplicated source of regions/communes. All dashboard *values* now come
 * from GET /api/dashboard — nothing here derives data anymore.
 */

import catalogJson from "@/data/oversio-identifiers.json"

import type { RegionRef, TerritoryCatalog } from "@/types/dashboard"
import { ALL_VALUE } from "@/types/dashboard"

const catalog = catalogJson as unknown as TerritoryCatalog

export const regions: RegionRef[] = catalog.regions

export interface Option {
  value: string
  label: string
}

export const periodOptions: Option[] = [
  { value: "all", label: "Año completo" },
  { value: "q1", label: "T1 (ene.–mar.)" },
  { value: "q2", label: "T2 (abr.–jun.)" },
  { value: "q3", label: "T3 (jul.–sept.)" },
  { value: "q4", label: "T4 (oct.–dic.)" },
]

export const regionOptions: Option[] = [
  { value: ALL_VALUE, label: "Todas las regiones" },
  ...regions.map((r) => ({ value: r.romanNumber, label: `${r.romanNumber} — ${r.name}` })),
]

export function communeOptions(region: string): Option[] {
  if (region === ALL_VALUE) {
    return [{ value: ALL_VALUE, label: "Todas las comunas" }]
  }
  const regionRef = regions.find((r) => r.romanNumber === region)
  return [
    { value: ALL_VALUE, label: "Todas las comunas" },
    ...(regionRef?.communes.map((c) => ({
      value: c.identifier,
      label: `${c.name} (${c.identifier})`,
    })) ?? []),
  ]
}
