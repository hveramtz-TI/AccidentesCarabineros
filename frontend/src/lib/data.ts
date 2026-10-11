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
  { value: "all", label: "Full period" },
  { value: "q1", label: "Q1 (Jan–Mar)" },
  { value: "q2", label: "Q2 (Apr–Jun)" },
  { value: "q3", label: "Q3 (Jul–Sep)" },
  { value: "q4", label: "Q4 (Oct–Dec)" },
]

export const regionOptions: Option[] = [
  { value: ALL_VALUE, label: "All regions" },
  ...regions.map((r) => ({ value: r.romanNumber, label: `${r.romanNumber} — ${r.name}` })),
]

export function communeOptions(region: string): Option[] {
  if (region === ALL_VALUE) {
    return [{ value: ALL_VALUE, label: "All communes" }]
  }
  const regionRef = regions.find((r) => r.romanNumber === region)
  return [
    { value: ALL_VALUE, label: "All communes" },
    ...(regionRef?.communes.map((c) => ({
      value: c.identifier,
      label: `${c.name} (${c.identifier})`,
    })) ?? []),
  ]
}
