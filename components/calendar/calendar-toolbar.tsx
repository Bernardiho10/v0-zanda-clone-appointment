"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, Filter, Download, Settings, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarToolbarProps {
  currentDate: Date
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onNewAppointment: () => void
  onTimeFinder?: () => void // Added Time Finder callback
  appointmentCount?: number
  className?: string
}

export function CalendarToolbar({
  currentDate,
  onPrevious,
  onNext,
  onToday,
  onNewAppointment,
  onTimeFinder, // Added Time Finder prop
  appointmentCount = 0,
  className,
}: CalendarToolbarProps) {
  const formatCurrentDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className={cn("flex items-center justify-between p-4 border-b bg-background", className)}>
      {/* Left Section - Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">{formatCurrentDate(currentDate)}</h1>
        </div>
      </div>

      {/* Center Section - Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{appointmentCount} appointments</span>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {onTimeFinder && (
          <Button variant="outline" size="sm" onClick={onTimeFinder}>
            <Search className="h-4 w-4 mr-2" />
            Time Finder
          </Button>
        )}
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button onClick={onNewAppointment} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>
    </div>
  )
}
