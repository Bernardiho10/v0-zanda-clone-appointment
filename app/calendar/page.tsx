"use client"

import { useState, useEffect } from "react"
import { AppointmentCalendar } from "@/components/calendar/appointment-calendar"
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar"
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar"
import { AppointmentDetailsSidebar } from "@/components/calendar/appointment-details-sidebar"
import { TimeFinderModal } from "@/components/calendar/time-finder-modal" // Added Time Finder import
import { QuickAppointmentForm } from "@/components/forms/quick-appointment-form" // Added Quick Appointment Form import
import { AppointmentService } from "@/lib/appointments"
import type { Appointment, Client } from "@/types/appointment"
import { format, addMinutes } from "date-fns" // Added date utilities

// Mock tenant ID - in real app this would come from auth/context
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false)
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(0)
  const [isTimeFinderOpen, setIsTimeFinderOpen] = useState(false)
  const [isQuickAppointmentOpen, setIsQuickAppointmentOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string; duration: number } | null>(null)

  const appointmentService = new AppointmentService(MOCK_TENANT_ID)

  useEffect(() => {
    loadData()
  }, [currentDate])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get date range for current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Load appointments and clients
      const [appointmentsData, clientsData] = await Promise.all([
        appointmentService.getAppointments(startOfMonth.toISOString(), endOfMonth.toISOString()),
        appointmentService.getClients(),
      ])

      setAppointments(appointmentsData)
      setClients(clientsData)
    } catch (error) {
      console.error("Failed to load calendar data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleNewAppointment = () => {
    setIsQuickAppointmentOpen(true)
  }

  const handleTimeFinder = () => {
    setIsTimeFinderOpen(true)
  }

  const handleTimeSelect = (date: Date, time: string, duration: number) => {
    setSelectedTimeSlot({ date, time, duration })
    setIsTimeFinderOpen(false)
    setIsQuickAppointmentOpen(true)
  }

  const handleQuickAppointmentSubmit = async (data: any) => {
    try {
      const newAppointment = await appointmentService.createAppointment(data)
      setAppointments((prev) => [...prev, newAppointment])
      setSelectedTimeSlot(null)
      console.log("Quick appointment created:", newAppointment)
    } catch (error) {
      console.error("Failed to create quick appointment:", error)
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsDetailsSidebarOpen(true)

    // Find the index of the selected appointment for navigation
    const index = appointments.findIndex((apt) => apt.appointment_id === appointment.appointment_id)
    setSelectedAppointmentIndex(index)

    console.log("Appointment clicked:", appointment)
  }

  const handleDateSelect = (start: Date, end: Date) => {
    // TODO: Open new appointment form with pre-filled dates
    console.log("Date range selected:", start, end)
  }

  const handleCloseSidebar = () => {
    setIsDetailsSidebarOpen(false)
    setSelectedAppointment(null)
  }

  const handleSaveAppointment = async (updatedAppointment: Appointment) => {
    try {
      await appointmentService.updateAppointment(updatedAppointment.appointment_id, updatedAppointment)

      // Update the appointments list
      setAppointments((prev) =>
        prev.map((apt) => (apt.appointment_id === updatedAppointment.appointment_id ? updatedAppointment : apt)),
      )

      setSelectedAppointment(updatedAppointment)
      console.log("Appointment saved:", updatedAppointment)
    } catch (error) {
      console.error("Failed to save appointment:", error)
    }
  }

  const handleDeleteAppointment = async (appointmentId: number) => {
    try {
      await appointmentService.deleteAppointment(appointmentId)

      // Remove from appointments list
      setAppointments((prev) => prev.filter((apt) => apt.appointment_id !== appointmentId))

      // Close sidebar
      handleCloseSidebar()
      console.log("Appointment deleted:", appointmentId)
    } catch (error) {
      console.error("Failed to delete appointment:", error)
    }
  }

  const handlePreviousAppointment = () => {
    if (selectedAppointmentIndex > 0) {
      const prevIndex = selectedAppointmentIndex - 1
      const prevAppointment = appointments[prevIndex]
      setSelectedAppointment(prevAppointment)
      setSelectedAppointmentIndex(prevIndex)
    }
  }

  const handleNextAppointment = () => {
    if (selectedAppointmentIndex < appointments.length - 1) {
      const nextIndex = selectedAppointmentIndex + 1
      const nextAppointment = appointments[nextIndex]
      setSelectedAppointment(nextAppointment)
      setSelectedAppointmentIndex(nextIndex)
    }
  }

  const getDefaultAppointmentTimes = () => {
    if (selectedTimeSlot) {
      const { date, time, duration } = selectedTimeSlot
      const [hours, minutes] = time.split(":").map(Number)
      const startTime = new Date(date)
      startTime.setHours(hours, minutes, 0, 0)
      const endTime = addMinutes(startTime, duration)

      return {
        start: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        end: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      }
    }
    return {
      start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end: format(addMinutes(new Date(), 60), "yyyy-MM-dd'T'HH:mm"),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  const defaultTimes = getDefaultAppointmentTimes()

  return (
    <div className="flex flex-col h-screen bg-background">
      <CalendarToolbar
        currentDate={currentDate}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onNewAppointment={handleNewAppointment}
        onTimeFinder={handleTimeFinder} // Added Time Finder callback
        appointmentCount={appointments.length}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6">
          <AppointmentCalendar
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onDateSelect={handleDateSelect}
            tenantId={MOCK_TENANT_ID}
          />
        </div>

        {!isDetailsSidebarOpen && (
          <CalendarSidebar
            selectedDate={currentDate}
            appointments={appointments}
            clients={clients}
            onNewAppointment={handleNewAppointment}
            onAppointmentSelect={handleAppointmentClick}
            className="border-l"
          />
        )}

        <AppointmentDetailsSidebar
          appointment={selectedAppointment}
          isOpen={isDetailsSidebarOpen}
          onClose={handleCloseSidebar}
          onSave={handleSaveAppointment}
          onDelete={handleDeleteAppointment}
          onPrevious={handlePreviousAppointment}
          onNext={handleNextAppointment}
        />
      </div>

      <TimeFinderModal
        open={isTimeFinderOpen}
        onOpenChange={setIsTimeFinderOpen}
        appointments={appointments}
        onTimeSelect={handleTimeSelect}
      />

      <QuickAppointmentForm
        open={isQuickAppointmentOpen}
        onOpenChange={setIsQuickAppointmentOpen}
        clients={clients}
        onSubmit={handleQuickAppointmentSubmit}
        defaultStartTime={defaultTimes.start}
        defaultEndTime={defaultTimes.end}
      />
    </div>
  )
}
