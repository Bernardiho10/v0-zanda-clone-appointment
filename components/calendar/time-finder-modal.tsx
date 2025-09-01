"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X, Clock } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { timeFinderService, type TimeFinderFilters, type AvailableDay } from "@/lib/time-finder"
import type { Appointment } from "@/types/appointment"

interface TimeFinderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointments: Appointment[]
  onTimeSelect?: (date: Date, time: string, duration: number) => void
  defaultDuration?: number
  className?: string
}

const durations = [
  { value: 15, label: "00:15" },
  { value: 30, label: "00:30" },
  { value: 45, label: "00:45" },
  { value: 60, label: "01:00" },
  { value: 90, label: "01:30" },
  { value: 120, label: "02:00" },
]

const practitioners = ["All Practitioners", "Physiotherapists", "Dr. Smith", "Dr. Johnson", "Dr. Williams"]

const locations = ["All Locations", "Bodymotions Physio Lounge", "Room 1", "Room 2", "Room 3"]

const resources = ["All Resources", "ROOM 1", "ROOM 2", "ROOM 3", "Equipment A", "Equipment B"]

export function TimeFinderModal({
  open,
  onOpenChange,
  appointments,
  onTimeSelect,
  defaultDuration = 60,
  className,
}: TimeFinderModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([])
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])

  const [filters, setFilters] = useState<TimeFinderFilters>({
    duration: defaultDuration,
    practitioner: "Physiotherapists",
    location: "Bodymotions Physio Lounge",
    resource: "ROOM 1",
  })

  useEffect(() => {
    if (open) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const slots = timeFinderService.findAvailableSlots(year, month, appointments, filters)
      setAvailableDays(slots)
    }
  }, [open, currentDate, appointments, filters])

  const handlePreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1))
    setSelectedDate(null)
    setSelectedTimeSlots([])
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1))
    setSelectedDate(null)
    setSelectedTimeSlots([])
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Get available slots for the selected date
    const dayData = availableDays.find((day) => isSameDay(day.date, date))
    if (dayData) {
      const availableSlots = dayData.availableSlots
        .filter((slot) => slot.available)
        .slice(0, 8) // Show max 8 slots
        .map((slot) => slot.time)
      setSelectedTimeSlots(availableSlots)
    }
  }

  const handleTimeSlotSelect = (time: string) => {
    if (selectedDate && onTimeSelect) {
      onTimeSelect(selectedDate, time, filters.duration)
      onOpenChange(false)
    }
  }

  const formatMonthYear = (date: Date) => {
    return format(date, "MMMM yyyy").toUpperCase()
  }

  const getDaysOfWeek = () => {
    return ["M", "T", "W", "T", "F", "S", "S"]
  }

  const getCalendarDays = () => {
    const start = startOfMonth(currentDate)
    const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1 // Monday = 0
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayData = availableDays.find((d) => isSameDay(d.date, date))
      days.push({
        date,
        day,
        hasAvailability: dayData?.hasAvailability || false,
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      })
    }

    return days
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl h-[600px] p-0", className)}>
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Time Finder</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-full">
          {/* Left Panel - Filters */}
          <div className="w-80 p-6 border-r bg-muted/20">
            <div className="space-y-6">
              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Duration</Label>
                <Select
                  value={filters.duration.toString()}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, duration: Number.parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value.toString()}>
                        {duration.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Practitioner */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Practitioner</Label>
                <Select
                  value={filters.practitioner}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, practitioner: value }))}
                >
                  <SelectTrigger>
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
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
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
              </div>

              {/* Resource */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resource</Label>
                <Select
                  value={filters.resource}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, resource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource} value={resource}>
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground">Select a location to filter by resources</div>
            </div>
          </div>

          {/* Right Panel - Calendar */}
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">{formatMonthYear(currentDate)}</h3>
                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysOfWeek().map((day) => (
                    <div
                      key={day}
                      className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays().map((dayData, index) => (
                    <div key={index} className="h-12 relative">
                      {dayData ? (
                        <Button
                          variant={dayData.isSelected ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full h-full text-sm font-medium",
                            dayData.hasAvailability && "border-2 border-primary/20",
                            dayData.isSelected && "bg-primary text-primary-foreground",
                          )}
                          onClick={() => handleDateSelect(dayData.date)}
                        >
                          {dayData.day}
                          {dayData.hasAvailability && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                          )}
                        </Button>
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Time Slots */}
              {selectedDate && selectedTimeSlots.length > 0 && (
                <Card className="p-4 mt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Available times for {format(selectedDate, "EEEE, MMMM d")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTimeSlots.map((time) => (
                        <Button
                          key={time}
                          variant="outline"
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleTimeSlotSelect(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {selectedDate && selectedTimeSlots.length === 0 && (
                <Card className="p-4 mt-6">
                  <div className="text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No available time slots for this date</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
