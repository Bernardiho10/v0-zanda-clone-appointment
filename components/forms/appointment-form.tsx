"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, MapPin, User, Bell, AlertTriangle, Search, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { appointmentFormSchema, type AppointmentFormData } from "@/lib/validation/appointment"
import type { Appointment, Client, AppointmentStatus } from "@/types/appointment"

interface AppointmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment | null
  clients: Client[]
  onSubmit: (data: AppointmentFormData) => Promise<void>
  onClientSearch?: (search: string) => Promise<Client[]>
  defaultStartTime?: string
  defaultEndTime?: string
  loading?: boolean
}

const appointmentStatuses: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: "Pending", label: "Pending", color: "bg-amber-100 text-amber-800" },
  { value: "Confirmed", label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: "Completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "No Show", label: "No Show", color: "bg-gray-100 text-gray-800" },
  { value: "Rescheduled", label: "Rescheduled", color: "bg-purple-100 text-purple-800" },
  { value: "In Progress", label: "In Progress", color: "bg-cyan-100 text-cyan-800" },
]

const appointmentTypes = [
  "Client Appointment",
  "Consultation",
  "Follow-up",
  "Assessment",
  "Treatment",
  "Telehealth",
  "Group Session",
  "Emergency",
]

const locations = ["Room 1", "Room 2", "Room 3", "Telehealth", "Reception", "Gym", "Hydrotherapy Pool"]

const practitioners = ["Dr. Smith", "Dr. Johnson", "Dr. Williams", "Physiotherapist", "Massage Therapist"]

export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  clients,
  onSubmit,
  onClientSearch,
  defaultStartTime,
  defaultEndTime,
  loading = false,
}: AppointmentFormProps) {
  const [clientSearch, setClientSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const isEditing = !!appointment

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      client_number: appointment?.client_number || 0,
      appointment_title: appointment?.appointment_title || "",
      start_time: appointment?.start_time || defaultStartTime || "",
      end_time: appointment?.end_time || defaultEndTime || "",
      appointment_status_id: appointment?.appointment_status_id || "Pending",
      appointment_type_id: appointment?.appointment_type_id || "Client Appointment",
      location: appointment?.location || "",
      diary: appointment?.diary || "",
      notes: appointment?.notes || "",
      schedule_reminder: appointment?.schedule_reminder ?? true,
      warning: appointment?.warning ?? false,
      created_on_client_portal: appointment?.created_on_client_portal ?? false,
      appointment_flag: appointment?.appointment_flag || "",
    },
  })

  // Set selected client when editing
  useEffect(() => {
    if (appointment && clients.length > 0) {
      const client = clients.find((c) => c.client_number === appointment.client_number)
      if (client) {
        setSelectedClient(client)
      }
    }
  }, [appointment, clients])

  // Handle client search
  const handleClientSearch = async (search: string) => {
    setClientSearch(search)
    if (search.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      if (onClientSearch) {
        const results = await onClientSearch(search)
        setSearchResults(results)
      } else {
        // Filter from existing clients
        const filtered = clients.filter(
          (client) =>
            client.full_name.toLowerCase().includes(search.toLowerCase()) ||
            client.email?.toLowerCase().includes(search.toLowerCase()) ||
            client.mobile_number?.includes(search),
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error("Client search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    form.setValue("client_number", client.client_number)
    setClientSearch("")
    setSearchResults([])
  }

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      await onSubmit(data)
      onOpenChange(false)
      form.reset()
      setSelectedClient(null)
      setClientSearch("")
      setSearchResults([])
    } catch (error) {
      console.error("Form submission failed:", error)
    }
  }

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return ""
    try {
      return format(new Date(dateTime), "PPP 'at' p")
    } catch {
      return dateTime
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the appointment details below."
              : "Create a new appointment by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Client Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedClient ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{selectedClient.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedClient.email} • {selectedClient.mobile_number}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(null)
                          form.setValue("client_number", 0)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search clients by name, email, or phone..."
                          value={clientSearch}
                          onChange={(e) => handleClientSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {searchResults.length > 0 && (
                        <Card className="max-h-48 overflow-y-auto">
                          <CardContent className="p-2">
                            {searchResults.map((client) => (
                              <div
                                key={client.client_number}
                                className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                                onClick={() => handleClientSelect(client)}
                              >
                                <div>
                                  <p className="font-medium text-sm">{client.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {client.email} • {client.mobile_number}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="client_number"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* When & Where */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    When & Where
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={field.value ? field.value.slice(0, 16) : ""}
                              onChange={(e) => field.onChange(e.target.value + ":00.000Z")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={field.value ? field.value.slice(0, 16) : ""}
                              onChange={(e) => field.onChange(e.target.value + ":00.000Z")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location} value={location}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {location}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="diary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Practitioner</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select practitioner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {practitioners.map((practitioner) => (
                                <SelectItem key={practitioner} value={practitioner}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {practitioner}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Appointment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="appointment_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter appointment title..." {...field} />
                        </FormControl>
                        <FormDescription>Optional title to describe the appointment</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="appointment_type_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appointment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appointmentTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="appointment_status_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appointmentStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", status.color)} variant="secondary">
                                      {status.label}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes or comments about this appointment..."
                            className="min-h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Schedule Reminder
                      </FormLabel>
                      <FormDescription>Send appointment reminders to the client</FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="schedule_reminder"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Warning Flag
                      </FormLabel>
                      <FormDescription>Mark this appointment with a warning flag</FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="warning"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="appointment_flag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flag Note</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter flag note..." {...field} />
                        </FormControl>
                        <FormDescription>Optional note for the warning flag</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={form.handleSubmit(handleSubmit)} disabled={loading || !selectedClient}>
            {loading ? "Saving..." : isEditing ? "Update Appointment" : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
