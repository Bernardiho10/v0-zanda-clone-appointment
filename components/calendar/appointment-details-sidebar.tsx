"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { User, X, ChevronLeft, ChevronRight, Bell, Copy, MessageSquare, CalendarIcon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/types/appointment"

interface AppointmentDetailsSidebarProps {
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onSave?: (appointment: Appointment) => void
  onDelete?: (appointmentId: number) => void
  onPrevious?: () => void
  onNext?: () => void
  className?: string
}

export function AppointmentDetailsSidebar({
  appointment,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onPrevious,
  onNext,
  className,
}: AppointmentDetailsSidebarProps) {
  const [editedAppointment, setEditedAppointment] = useState<Appointment | null>(null)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [telehealthEnabled, setTelehealthEnabled] = useState(false)
  const [comments, setComments] = useState("")

  useEffect(() => {
    if (appointment) {
      setEditedAppointment(appointment)
      setComments(appointment.notes || "")
      // Set other states based on appointment data
    }
  }, [appointment])

  if (!isOpen || !appointment) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "No Show":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "Rescheduled":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "In Progress":
        return "bg-cyan-100 text-cyan-800 border-cyan-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleSave = () => {
    if (editedAppointment && onSave) {
      const updatedAppointment = {
        ...editedAppointment,
        notes: comments,
      }
      onSave(updatedAppointment)
    }
  }

  const handleDelete = () => {
    if (appointment && onDelete) {
      onDelete(appointment.appointment_id)
    }
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    }
  }

  const startDateTime = formatDateTime(appointment.start_time)
  const endDateTime = formatDateTime(appointment.end_time)

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 transform transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full",
        className,
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-lg text-primary">{appointment.full_name || "Unknown Client"}</h2>
            <Button variant="ghost" size="sm" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* When & Where Section */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">When & Where</h3>
              <div className="flex items-center gap-1 ml-auto">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">When</Label>
                <p className="text-sm font-medium">{startDateTime.date}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Time</Label>
                <p className="text-sm font-medium">
                  {startDateTime.time} - {endDateTime.time}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                <p className="text-sm font-medium">{appointment.location || "Not specified"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">With</Label>
                <p className="text-sm font-medium">{appointment.diary || "Not assigned"}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <span>Previous</span>
                <span className="font-medium">Fri 01 Aug 2025 15:30</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>Next</span>
                <span className="font-medium">Mon 04 Aug 2025 15:30</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Appointment Details Section */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Appointment Details</h3>
              <div className="flex items-center gap-1 ml-auto">
                <Copy className="h-4 w-4 text-muted-foreground" />
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-4">
              {/* Reminder */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="reminder" className="text-sm font-medium">
                    Reminder
                  </Label>
                  <Switch id="reminder" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>Will be sent</span>
                  <Bell className="h-4 w-4" />
                </div>
              </div>

              {/* Telehealth */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="telehealth" className="text-sm font-medium">
                    Telehealth
                  </Label>
                  <Switch id="telehealth" checked={telehealthEnabled} onCheckedChange={setTelehealthEnabled} />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy link
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs bg-primary text-primary-foreground">
                    START
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={editedAppointment?.appointment_status_id}
                  onValueChange={(value) =>
                    setEditedAppointment((prev) => (prev ? { ...prev, appointment_status_id: value } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                    <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Flag */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Flag</Label>
                <Select defaultValue="mariam-sorunke">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mariam-sorunke">Mariam Sorunke</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resources */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resources</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room-1">Room 1</SelectItem>
                    <SelectItem value="room-2">Room 2</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Template</SelectItem>
                    <SelectItem value="followup">Follow-up Template</SelectItem>
                    <SelectItem value="initial">Initial Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Comments..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90">
            SAVE
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
          >
            DELETE
          </Button>
          <Button className="w-full bg-primary hover:bg-primary/90 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SEND SMS
          </Button>
          <div className="text-center text-xs text-muted-foreground">Estimated number of messages: 0</div>
        </div>
      </div>
    </div>
  )
}
