"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, addMinutes } from "date-fns"
import type { z } from "zod" // Import zod to declare z variable
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, User, Plus } from "lucide-react"
import { appointmentFormSchema, type AppointmentFormData } from "@/lib/validation/appointment"
import type { Client } from "@/types/appointment"

interface QuickAppointmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  onSubmit: (data: AppointmentFormData) => Promise<void>
  defaultStartTime?: string
  defaultEndTime?: string
  loading?: boolean
}

const quickAppointmentSchema = appointmentFormSchema.pick({
  client_number: true,
  start_time: true,
  end_time: true,
  appointment_type_id: true,
  location: true,
  diary: true,
})

type QuickAppointmentData = z.infer<typeof quickAppointmentSchema>

const appointmentTypes = ["Client Appointment", "Consultation", "Follow-up", "Assessment", "Treatment"]

const locations = ["Room 1", "Room 2", "Room 3", "Telehealth"]

const practitioners = ["Dr. Smith", "Dr. Johnson", "Dr. Williams"]

export function QuickAppointmentForm({
  open,
  onOpenChange,
  clients,
  onSubmit,
  defaultStartTime,
  defaultEndTime,
  loading = false,
}: QuickAppointmentFormProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const form = useForm<QuickAppointmentData>({
    resolver: zodResolver(quickAppointmentSchema),
    defaultValues: {
      client_number: 0,
      start_time: defaultStartTime || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: defaultEndTime || format(addMinutes(new Date(), 60), "yyyy-MM-dd'T'HH:mm"),
      appointment_type_id: "Client Appointment",
      location: "",
      diary: "",
    },
  })

  const handleClientSelect = (clientNumber: string) => {
    const client = clients.find((c) => c.client_number === Number.parseInt(clientNumber))
    setSelectedClient(client || null)
    form.setValue("client_number", Number.parseInt(clientNumber))
  }

  const handleSubmit = async (data: QuickAppointmentData) => {
    try {
      const fullData: AppointmentFormData = {
        ...data,
        appointment_title: "",
        appointment_status_id: "Pending",
        notes: "",
        schedule_reminder: true,
        warning: false,
        created_on_client_portal: false,
        appointment_flag: "",
      }

      await onSubmit(fullData)
      onOpenChange(false)
      form.reset()
      setSelectedClient(null)
    } catch (error) {
      console.error("Quick appointment creation failed:", error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Appointment
          </SheetTitle>
          <SheetDescription>Create a new appointment quickly with essential details.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client
                  </FormLabel>
                  <Select onValueChange={handleClientSelect} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.client_number} value={client.client_number.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{client.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {client.email} • {client.mobile_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? field.value.slice(0, 16) : ""}
                        onChange={(e) => field.onChange(e.target.value)}
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
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type & Location */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Practitioner */}
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
                          {practitioner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Client Preview */}
            {selectedClient && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedClient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedClient.email} • {selectedClient.mobile_number}
                </p>
                {selectedClient.date_of_birth && (
                  <p className="text-xs text-muted-foreground">
                    DOB: {format(new Date(selectedClient.date_of_birth), "PPP")}
                  </p>
                )}
              </div>
            )}
          </form>
        </Form>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={form.handleSubmit(handleSubmit)} disabled={loading || !selectedClient}>
            {loading ? "Creating..." : "Create Appointment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
