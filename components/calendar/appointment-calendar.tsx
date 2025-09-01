"use client"

import { useState, useEffect, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import type { EventInput, EventClickArg, DateSelectArg } from "@fullcalendar/core"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/types/appointment"

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onDateSelect?: (start: Date, end: Date) => void
  onAppointmentUpdate?: (appointmentId: number, updates: Partial<Appointment>) => void
  className?: string
  tenantId: string
}

const statusColors = {
  Pending: "#f59e0b", // amber-500
  Confirmed: "#3b82f6", // blue-500
  Completed: "#10b981", // emerald-500
  Cancelled: "#ef4444", // red-500
  "No Show": "#6b7280", // gray-500
  Rescheduled: "#8b5cf6", // violet-500
  "In Progress": "#06b6d4", // cyan-500
} as const

export function AppointmentCalendar({
  appointments,
  onAppointmentClick,
  onDateSelect,
  onAppointmentUpdate,
  className,
  tenantId,
}: AppointmentCalendarProps) {
  const [currentView, setCurrentView] = useState("timeGridWeek")
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([])

  // Convert appointments to FullCalendar events
  const convertAppointmentsToEvents = useCallback((appointments: Appointment[]): EventInput[] => {
    return appointments.map((appointment) => ({
      id: appointment.appointment_id.toString(),
      title: appointment.appointment_title || appointment.full_name || "Appointment",
      start: appointment.start_time,
      end: appointment.end_time,
      backgroundColor: statusColors[appointment.appointment_status_id] || statusColors.Pending,
      borderColor: statusColors[appointment.appointment_status_id] || statusColors.Pending,
      textColor: "#ffffff",
      extendedProps: {
        appointment,
        status: appointment.appointment_status_id,
        clientName: appointment.full_name,
        location: appointment.location,
        notes: appointment.notes,
        diary: appointment.diary,
      },
    }))
  }, [])

  useEffect(() => {
    setCalendarEvents(convertAppointmentsToEvents(appointments))
  }, [appointments, convertAppointmentsToEvents])

  const handleEventClick = (clickInfo: EventClickArg) => {
    const appointment = clickInfo.event.extendedProps.appointment as Appointment
    clickInfo.el.style.transform = "scale(0.98)"
    setTimeout(() => {
      clickInfo.el.style.transform = "scale(1)"
    }, 150)

    onAppointmentClick?.(appointment)
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    onDateSelect?.(selectInfo.start, selectInfo.end)
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view)
  }

  return (
    <Card className={cn("p-6", className)}>
      {/* Calendar Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Appointment Calendar</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "dayGridMonth" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("dayGridMonth")}
          >
            Month
          </Button>
          <Button
            variant={currentView === "timeGridWeek" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("timeGridWeek")}
          >
            Week
          </Button>
          <Button
            variant={currentView === "timeGridDay" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("timeGridDay")}
          >
            Day
          </Button>
          <Button
            variant={currentView === "listWeek" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("listWeek")}
          >
            List
          </Button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>

      {/* FullCalendar Component */}
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          initialView={currentView}
          view={currentView}
          events={calendarEvents}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          allDaySlot={false}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
            startTime: "08:00",
            endTime: "18:00",
          }}
          eventContent={(eventInfo) => (
            <div className="p-1 text-xs">
              <div className="font-medium truncate">{eventInfo.event.extendedProps.clientName}</div>
              <div className="flex items-center gap-1 mt-1 opacity-90">
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(eventInfo.event.start!).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {eventInfo.event.extendedProps.location && (
                <div className="flex items-center gap-1 mt-1 opacity-90">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{eventInfo.event.extendedProps.location}</span>
                </div>
              )}
            </div>
          )}
          dayHeaderContent={(args) => (
            <div className="text-center">
              <div className="font-semibold text-sm">{args.date.toLocaleDateString([], { weekday: "short" })}</div>
              <div className="text-lg font-bold">{args.date.getDate()}</div>
            </div>
          )}
        />
      </div>
    </Card>
  )
}
