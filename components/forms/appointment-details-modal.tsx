"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Appointment, Client } from "@/types/appointment"

interface AppointmentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  client?: Client | null
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointmentId: number) => void
  onStatusChange?: (appointmentId: number, status: string) => void
  loading?: boolean
}

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

export function AppointmentDetailsModal({
  open,
  onOpenChange,
  appointment,
  client,
  onEdit,
  onDelete,
  onStatusChange,
  loading = false,
}: AppointmentDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!appointment) return null

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(appointment.appointment_id)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete appointment:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!onStatusChange) return

    try {
      await onStatusChange(appointment.appointment_id, status)
    } catch (error) {
      console.error("Failed to update appointment status:", error)
    }
  }

  const formatDateTime = (dateTime: string) => {
    try {
      return format(new Date(dateTime), "PPP 'at' p")
    } catch {
      return dateTime
    }
  }

  const getDuration = () => {
    try {
      const start = new Date(appointment.start_time)
      const end = new Date(appointment.end_time)
      const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
      return `${diffMinutes} minutes`
    } catch {
      return "Unknown duration"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Details
            </div>
            <Badge className={cn("text-xs", getStatusColor(appointment.appointment_status_id))} variant="secondary">
              {appointment.appointment_status_id}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {appointment.appointment_title || "View and manage appointment details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{client.full_name}</p>
                  <p className="text-sm text-muted-foreground">Client #{client.client_number}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.email}</span>
                    </div>
                  )}
                  {client.mobile_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.mobile_number}</span>
                    </div>
                  )}
                </div>

                {client.date_of_birth && (
                  <div className="text-sm text-muted-foreground">
                    Date of Birth: {format(new Date(client.date_of_birth), "PPP")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Appointment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Appointment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(appointment.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(appointment.end_time)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">{getDuration()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">{appointment.appointment_type_id}</p>
                </div>
              </div>

              {appointment.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{appointment.location}</span>
                </div>
              )}

              {appointment.diary && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Practitioner: {appointment.diary}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {appointment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Warning Flag */}
          {appointment.warning && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Warning Flag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700">
                  {appointment.appointment_flag || "This appointment has been flagged for attention."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Reminder Scheduled</span>
                <Badge variant={appointment.schedule_reminder ? "default" : "secondary"}>
                  {appointment.schedule_reminder ? "Yes" : "No"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Created on Client Portal</span>
                <Badge variant={appointment.created_on_client_portal ? "default" : "secondary"}>
                  {appointment.created_on_client_portal ? "Yes" : "No"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Created</span>
                <span className="text-sm text-muted-foreground">{format(new Date(appointment.created_at), "PPP")}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Last Modified</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(appointment.last_modified), "PPP")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          {/* Status Actions */}
          <div className="flex gap-2 mr-auto">
            {appointment.appointment_status_id !== "Completed" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("Completed")} disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}

            {appointment.appointment_status_id !== "Cancelled" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("Cancelled")} disabled={loading}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {/* Main Actions */}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onEdit(appointment)
                onOpenChange(false)
              }}
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {onDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading || isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
