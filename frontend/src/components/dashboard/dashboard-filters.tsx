import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { communeOptions, periodOptions, regionOptions } from "@/lib/data"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters } from "@/types/dashboard"

interface Props {
  filters: DashboardFilters
  onChange: (next: DashboardFilters) => void
}

interface FilterSelectProps {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onValueChange: (value: string) => void
  className?: string
}

function FilterSelect({ id, label, value, options, onValueChange, className }: FilterSelectProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="metric-label mb-1 block">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="focus-glow h-9 w-full border-input bg-[#0a0b0d] font-mono text-xs sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="font-mono text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function DashboardFiltersBar({ filters, onChange }: Props) {
  return (
    <form
      className="flex flex-wrap items-end gap-x-3 gap-y-2"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Dashboard data filters"
    >
      <FilterSelect
        id="filter-period"
        label="Period"
        value={filters.period}
        options={periodOptions}
        onValueChange={(value) => onChange({ ...filters, period: value as DashboardFilters["period"] })}
      />
      <FilterSelect
        id="filter-region"
        label="Region"
        value={filters.region}
        options={regionOptions}
        onValueChange={(value) =>
          // Region change resets commune to keep the cascade coherent.
          onChange({ ...filters, region: value, commune: ALL_VALUE })
        }
      />
      <FilterSelect
        id="filter-commune"
        label="Commune"
        value={filters.commune}
        options={communeOptions(filters.region)}
        onValueChange={(value) => onChange({ ...filters, commune: value })}
      />
    </form>
  )
}
