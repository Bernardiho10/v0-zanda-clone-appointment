import { z } from "zod"

export const appointmentFormSchema = z
  .object({
    client_number: z.number().min(1, "Please select a client"),
    appointment_title: z.string().optional(),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    appointment_status_id: z
      .enum(["Pending", "Confirmed", "Completed", "Cancelled", "No Show", "Rescheduled", "In Progress"] as const)
      .default("Pending"),
    appointment_type_id: z.string().default("Client Appointment"),
    location: z.string().optional(),
    diary: z.string().optional(),
    notes: z.string().optional(),
    schedule_reminder: z.boolean().default(true),
    warning: z.boolean().default(false),
    created_on_client_portal: z.boolean().default(false),
    appointment_flag: z.string().optional(),
  })
  .refine(
    (data) => {
      const startTime = new Date(data.start_time)
      const endTime = new Date(data.end_time)
      return endTime > startTime
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    },
  )

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>

export const clientSearchSchema = z.object({
  search: z.string().min(1, "Search term is required"),
})

export type ClientSearchData = z.infer<typeof clientSearchSchema>
