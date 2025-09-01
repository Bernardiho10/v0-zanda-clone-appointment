"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, MapPin, User, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Appointment, Client } from "@/types/appointment"

interface CalendarSidebarProps {
  selectedDate?: Date
  appointments: Appointment[]
  clients: Client[]
  onNewAppointment?: () => void
  onAppointmentSelect?: (appointment: Appointment) => void
  className?: string
}

export function CalendarSidebar({
  selectedDate,
  appointments,
  clients,
  onNewAppointment,
  onAppointmentSelect,
  className,
}: CalendarSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<"all" | "today" | "upcoming">("today")

  // Filter appointments based on selected date and filter
  const filteredAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.start_time)
    const today = new Date()

    // Text search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        appointment.full_name?.toLowerCase().includes(searchLower) ||
        appointment.appointment_title?.toLowerCase().includes(searchLower) ||
        appointment.location?.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Date filter
    switch (selectedFilter) {
      case "today":
        return appointmentDate.toDateString() === today.toDateString()
      case "upcoming":
        return appointmentDate >= today
      case "all":
      default:
        return true
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-blue-100 text-blue-800"
      case "Pending":
        return "bg-amber-100 text-amber-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      case "No Show":
        return "bg-gray-100 text-gray-800"
      case "Rescheduled":
        return "bg-purple-100 text-purple-800"
      case "In Progress":
        return "bg-cyan-100 text-cyan-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className={cn("w-80 space-y-4", className)}>
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={onNewAppointment} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("all")}
            >
              All
            </Button>
            <Button
              variant={selectedFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("today")}
            >
              Today
            </Button>
            <Button
              variant={selectedFilter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("upcoming")}
            >
              Upcoming
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, title, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Appointments
            </span>
            <Badge variant="secondary">{filteredAppointments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 p-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments found</p>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <Card
                    key={appointment.appointment_id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onAppointmentSelect?.(appointment)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{appointment.full_name || "Unknown Client"}</h4>
                          {appointment.appointment_title && (
                            <p className="text-xs text-muted-foreground">{appointment.appointment_title}</p>
                          )}
                        </div>
                        <Badge
                          className={cn("text-xs", getStatusColor(appointment.appointment_status_id))}
                          variant="secondary"
                        >
                          {appointment.appointment_status_id}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(appointment.start_time).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {new Date(appointment.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {appointment.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{appointment.location}</span>
                          </div>
                        )}

                        {appointment.diary && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{appointment.diary}</span>
                          </div>
                        )}
                      </div>

                      {appointment.notes && (
                        <>
                          <Separator />
                          <p className="text-xs text-muted-foreground line-clamp-2">{appointment.notes}</p>
                        </>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
