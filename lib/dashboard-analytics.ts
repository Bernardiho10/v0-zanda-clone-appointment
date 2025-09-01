import { AppointmentService } from "./appointments"
import type { Appointment } from "@/types/appointment"
import { subMonths, format, eachDayOfInterval, isSameDay } from "date-fns"

export interface DashboardFilters {
  dateRange: {
    start: Date
    end: Date
  }
  practitioner?: string
  location?: string
}

export interface IncomeMetrics {
  invoiced: number
  paymentsReceived: number
  invoicedChange: number
  paymentsChange: number
}

export interface AppointmentMetrics {
  totalAttended: number
  totalNotAttended: number
  attendedChange: number
  notAttendedChange: number
  clinicalNotes: {
    noNote: number
    draft: number
    completed: number
  }
  statusBreakdown: Array<{
    date: string
    completed: number
    arrived: number
    confirmed: number
    pending: number
    rescheduled: number
    lateCancellation: number
    cancelled: number
    noShow: number
  }>
}

export interface ClientMetrics {
  totalNewClients: number
  newClientsChange: number
  sourceBreakdown: Array<{
    source: string
    count: number
  }>
  acquisitionTrend: Array<{
    date: string
    newClients: number
  }>
}

export interface DashboardData {
  income: IncomeMetrics
  appointments: AppointmentMetrics
  clients: ClientMetrics
}

export class DashboardAnalyticsService {
  constructor(private tenantId: string) {}

  async getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
    const appointmentService = new AppointmentService(this.tenantId)

    // Get appointments for current and previous periods
    const currentPeriodAppointments = await appointmentService.getAppointments(
      filters.dateRange.start.toISOString(),
      filters.dateRange.end.toISOString(),
    )

    const previousPeriodStart = subMonths(filters.dateRange.start, 1)
    const previousPeriodEnd = subMonths(filters.dateRange.end, 1)
    const previousPeriodAppointments = await appointmentService.getAppointments(
      previousPeriodStart.toISOString(),
      previousPeriodEnd.toISOString(),
    )

    // Calculate metrics
    const income = this.calculateIncomeMetrics(currentPeriodAppointments, previousPeriodAppointments)
    const appointments = this.calculateAppointmentMetrics(
      currentPeriodAppointments,
      previousPeriodAppointments,
      filters.dateRange,
    )
    const clients = this.calculateClientMetrics(
      currentPeriodAppointments,
      previousPeriodAppointments,
      filters.dateRange,
    )

    return {
      income,
      appointments,
      clients,
    }
  }

  private calculateIncomeMetrics(current: Appointment[], previous: Appointment[]): IncomeMetrics {
    // Mock calculations - in real app, this would use invoice/payment data
    const currentInvoiced = current.length * 150 // Average appointment value
    const currentPayments = currentInvoiced * 0.4 // 40% payment rate

    const previousInvoiced = previous.length * 150
    const previousPayments = previousInvoiced * 0.4

    const invoicedChange = previousInvoiced > 0 ? ((currentInvoiced - previousInvoiced) / previousInvoiced) * 100 : 0

    const paymentsChange = previousPayments > 0 ? ((currentPayments - previousPayments) / previousPayments) * 100 : 0

    return {
      invoiced: currentInvoiced,
      paymentsReceived: currentPayments,
      invoicedChange,
      paymentsChange,
    }
  }

  private calculateAppointmentMetrics(
    current: Appointment[],
    previous: Appointment[],
    dateRange: { start: Date; end: Date },
  ): AppointmentMetrics {
    const attended = current.filter((apt) => apt.appointment_status_id === "Completed").length
    const notAttended = current.filter((apt) => apt.appointment_status_id === "No Show").length

    const prevAttended = previous.filter((apt) => apt.appointment_status_id === "Completed").length
    const prevNotAttended = previous.filter((apt) => apt.appointment_status_id === "No Show").length

    const attendedChange = prevAttended > 0 ? ((attended - prevAttended) / prevAttended) * 100 : 0
    const notAttendedChange = prevNotAttended > 0 ? ((notAttended - prevNotAttended) / prevNotAttended) * 100 : 0

    // Clinical notes breakdown (mock data)
    const clinicalNotes = {
      noNote: Math.floor(current.length * 0.6),
      draft: Math.floor(current.length * 0.25),
      completed: Math.floor(current.length * 0.15),
    }

    // Status breakdown by day
    const statusBreakdown = this.generateStatusBreakdown(current, dateRange)

    return {
      totalAttended: attended,
      totalNotAttended: notAttended,
      attendedChange,
      notAttendedChange,
      clinicalNotes,
      statusBreakdown,
    }
  }

  private calculateClientMetrics(
    current: Appointment[],
    previous: Appointment[],
    dateRange: { start: Date; end: Date },
  ): ClientMetrics {
    // Get unique clients (mock - in real app would query clients table)
    const currentClients = new Set(current.map((apt) => apt.client_number)).size
    const previousClients = new Set(previous.map((apt) => apt.client_number)).size

    const newClientsChange = previousClients > 0 ? ((currentClients - previousClients) / previousClients) * 100 : 0

    // Mock source breakdown
    const sourceBreakdown = [
      { source: "Referral", count: Math.floor(currentClients * 0.4) },
      { source: "Online", count: Math.floor(currentClients * 0.3) },
      { source: "Walk-in", count: Math.floor(currentClients * 0.2) },
      { source: "Other", count: Math.floor(currentClients * 0.1) },
    ]

    // Acquisition trend
    const acquisitionTrend = this.generateAcquisitionTrend(dateRange, currentClients)

    return {
      totalNewClients: currentClients,
      newClientsChange,
      sourceBreakdown,
      acquisitionTrend,
    }
  }

  private generateStatusBreakdown(appointments: Appointment[], dateRange: { start: Date; end: Date }) {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

    return days
      .map((day) => {
        const dayAppointments = appointments.filter((apt) => isSameDay(new Date(apt.start_time), day))

        return {
          date: format(day, "M/d/yy"),
          completed: dayAppointments.filter((apt) => apt.appointment_status_id === "Completed").length,
          arrived: dayAppointments.filter((apt) => apt.appointment_status_id === "In Progress").length,
          confirmed: dayAppointments.filter((apt) => apt.appointment_status_id === "Confirmed").length,
          pending: dayAppointments.filter((apt) => apt.appointment_status_id === "Pending").length,
          rescheduled: dayAppointments.filter((apt) => apt.appointment_status_id === "Rescheduled").length,
          lateCancellation: 0, // Would need additional status
          cancelled: dayAppointments.filter((apt) => apt.appointment_status_id === "Cancelled").length,
          noShow: dayAppointments.filter((apt) => apt.appointment_status_id === "No Show").length,
        }
      })
      .slice(-30) // Last 30 days
  }

  private generateAcquisitionTrend(dateRange: { start: Date; end: Date }, totalClients: number) {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    const dailyAverage = Math.floor(totalClients / days.length)

    return days
      .map((day) => ({
        date: format(day, "M/d/yy"),
        newClients: Math.max(0, dailyAverage + Math.floor(Math.random() * 3 - 1)),
      }))
      .slice(-7) // Last 7 days
  }
}
