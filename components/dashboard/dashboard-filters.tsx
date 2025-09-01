"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { DashboardFilters as DashboardFiltersType } from "@/lib/dashboard-analytics"

interface DashboardFiltersProps {
  filters: DashboardFiltersType
  onFiltersChange: (filters: DashboardFiltersType) => void
  onApply: () => void
  className?: string
}

const practitioners = ["All Practitioners", "Physiotherapists", "Dr. Smith", "Dr. Johnson", "Dr. Williams"]

const locations = ["All Locations", "Bodymotions Physio Lounge", "Room 1", "Room 2", "Room 3"]

export function DashboardFilters({ filters, onFiltersChange, onApply, className }: DashboardFiltersProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: range.from,
          end: range.to,
        },
      })
    }
  }

  const handlePractitionerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      practitioner: value === "All Practitioners" ? undefined : value,
    })
  }

  const handleLocationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      location: value === "All Locations" ? undefined : value,
    })
  }

  const formatDateRange = () => {
    const { start, end } = filters.dateRange
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
  }

  return (
    <div className={cn("flex items-center gap-4 p-4 bg-background border-b", className)}>
      {/* Date Range Picker */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">This Month</span>
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !filters.dateRange && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange.start}
              selected={{
                from: filters.dateRange.start,
                to: filters.dateRange.end,
              }}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Practitioner Filter */}
      <Select value={filters.practitioner || "All Practitioners"} onValueChange={handlePractitionerChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {practitioners.map((practitioner) => (
            <SelectItem key={practitioner} value={practitioner}>
              {practitioner}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location Filter */}
      <Select value={filters.location || "All Locations"} onValueChange={handleLocationChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Apply Button */}
      <Button onClick={onApply} className="bg-primary hover:bg-primary/90">
        APPLY
      </Button>
    </div>
  )
}
