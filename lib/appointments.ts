import { queryWithTenant } from "./database"
import type { Appointment, CreateAppointmentData, UpdateAppointmentData, Client } from "../types/appointment"

export class AppointmentService {
  constructor(private tenantId: string) {}

  // Get all appointments for a date range
  async getAppointments(startDate: string, endDate: string): Promise<Appointment[]> {
    const query = `
      SELECT 
        ca.*,
        c.full_name as client_full_name
      FROM client_appointments ca
      LEFT JOIN clients c ON ca.client_number = c.client_number
      WHERE ca.start_time >= $1 
        AND ca.end_time <= $2
        AND ca.cancellation_reason IS NULL
      ORDER BY ca.start_time ASC
    `

    return await queryWithTenant<Appointment>(this.tenantId, query, [startDate, endDate])
  }

  // Get appointment by ID
  async getAppointment(appointmentId: number): Promise<Appointment | null> {
    const query = `
      SELECT 
        ca.*,
        c.full_name as client_full_name
      FROM client_appointments ca
      LEFT JOIN clients c ON ca.client_number = c.client_number
      WHERE ca.appointment_id = $1
    `

    const results = await queryWithTenant<Appointment>(this.tenantId, query, [appointmentId])

    return results[0] || null
  }

  // Create new appointment
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const query = `
      INSERT INTO client_appointments (
        tenant_id,
        client_number,
        start_time,
        end_time,
        appointment_status_id,
        appointment_type_id,
        location,
        notes,
        appointment_title,
        diary,
        schedule_reminder
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `

    const results = await queryWithTenant<Appointment>(this.tenantId, query, [
      this.tenantId,
      data.client_number,
      data.start_time,
      data.end_time,
      data.appointment_status_id || "Pending",
      data.appointment_type_id || "Client Appointment",
      data.location,
      data.notes,
      data.appointment_title,
      data.diary,
      data.schedule_reminder ?? true,
    ])

    return results[0]
  }

  // Update appointment
  async updateAppointment(data: UpdateAppointmentData): Promise<Appointment> {
    const fields = []
    const values = []
    let paramCount = 1

    if (data.start_time !== undefined) {
      fields.push(`start_time = $${paramCount++}`)
      values.push(data.start_time)
    }
    if (data.end_time !== undefined) {
      fields.push(`end_time = $${paramCount++}`)
      values.push(data.end_time)
    }
    if (data.appointment_status_id !== undefined) {
      fields.push(`appointment_status_id = $${paramCount++}`)
      values.push(data.appointment_status_id)
    }
    if (data.location !== undefined) {
      fields.push(`location = $${paramCount++}`)
      values.push(data.location)
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`)
      values.push(data.notes)
    }
    if (data.appointment_title !== undefined) {
      fields.push(`appointment_title = $${paramCount++}`)
      values.push(data.appointment_title)
    }

    fields.push(`last_modified = CURRENT_TIMESTAMP`)
    values.push(data.appointment_id)

    const query = `
      UPDATE client_appointments 
      SET ${fields.join(", ")}
      WHERE appointment_id = $${paramCount}
      RETURNING *
    `

    const results = await queryWithTenant<Appointment>(this.tenantId, query, values)

    return results[0]
  }

  // Delete appointment (soft delete by setting cancellation reason)
  async deleteAppointment(appointmentId: number, reason = "Cancelled"): Promise<void> {
    const query = `
      UPDATE client_appointments 
      SET cancellation_reason = $1, 
          appointment_status_id = 'Cancelled',
          last_modified = CURRENT_TIMESTAMP
      WHERE appointment_id = $2
    `

    await queryWithTenant(this.tenantId, query, [reason, appointmentId])
  }

  // Get clients for appointment booking
  async getClients(search?: string): Promise<Client[]> {
    let query = `
      SELECT * FROM clients 
      WHERE status = 'Active' 
        AND is_archived = false
    `
    const params: any[] = []

    if (search) {
      query += ` AND (full_name ILIKE $1 OR email ILIKE $1 OR mobile_number ILIKE $1)`
      params.push(`%${search}%`)
    }

    query += ` ORDER BY full_name ASC LIMIT 50`

    return await queryWithTenant<Client>(this.tenantId, query, params)
  }

  // Check for appointment conflicts
  async checkConflict(
    startTime: string,
    endTime: string,
    diary?: string,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    let query = `
      SELECT 1 FROM client_appointments
      WHERE start_time < $2 
        AND end_time > $1
        AND cancellation_reason IS NULL
    `
    const params = [startTime, endTime]
    let paramCount = 3

    if (diary) {
      query += ` AND diary = $${paramCount++}`
      params.push(diary)
    }

    if (excludeAppointmentId) {
      query += ` AND appointment_id != $${paramCount++}`
      params.push(excludeAppointmentId)
    }

    const results = await queryWithTenant(this.tenantId, query, params)
    return results.length > 0
  }
}
