export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "No Show"
  | "Rescheduled"
  | "In Progress"

export type UserRole = "super_admin" | "admin" | "practitioner" | "receptionist" | "client"

export interface Client {
  client_number: number
  tenant_id: string
  full_name: string
  first_name: string
  last_name: string
  mobile_number?: string
  email?: string
  date_of_birth?: string
  address?: string
  suburb?: string
  postcode?: string
  state?: string
  timezone?: string
  status: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  appointment_id: number
  tenant_id: string
  client_number: number
  full_name?: string
  diary?: string
  recurrence_rule?: string
  cancellation_reason?: string
  start_time: string
  end_time: string
  appointment_status_id: AppointmentStatus
  appointment_type_id: string
  client_appointment_group_id?: number
  location?: string
  schedule_reminder: boolean
  recurring_appointment_id?: number
  notes?: string
  warning: boolean
  invoice_id?: number
  created_on_client_portal: boolean
  appointment_title?: string
  appointment_flag?: string
  created_at: string
  last_modified: string
}

export interface CreateAppointmentData {
  client_number: number
  start_time: string
  end_time: string
  appointment_status_id?: AppointmentStatus
  appointment_type_id?: string
  location?: string
  notes?: string
  appointment_title?: string
  diary?: string
  schedule_reminder?: boolean
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {
  appointment_id: number
}

export interface RecurringAppointment {
  series_id: number
  tenant_id: string
  client_number: number
  recurrence_rule: string
  start_time: string
  end_time: string
  diary: string
  location?: string
  notes?: string
  appointment_type: string
  created_at: string
  updated_at: string
}
