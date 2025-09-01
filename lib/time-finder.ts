import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  isBefore,
  addMinutes,
  setHours,
  setMinutes,
} from "date-fns"
import type { Appointment } from "@/types/appointment"

export interface TimeSlot {
  time: string
  available: boolean
  conflictCount: number
}

export interface AvailableDay {
  date: Date
  hasAvailability: boolean
  availableSlots: TimeSlot[]
}

export interface TimeFinderFilters {
  duration: number // in minutes
  practitioner?: string
  location?: string
  resource?: string
}

export class TimeFinderService {
  private businessHours = {
    start: 8, // 8 AM
    end: 18, // 6 PM
    slotDuration: 15, // 15 minutes
  }

  /**
   * Find available time slots for a given month and filters
   */
  findAvailableSlots(
    year: number,
    month: number,
    appointments: Appointment[],
    filters: TimeFinderFilters,
  ): AvailableDay[] {
    const monthStart = startOfMonth(new Date(year, month))
    const monthEnd = endOfMonth(new Date(year, month))
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    return daysInMonth.map((date) => {
      const dayAppointments = appointments.filter(
        (apt) => isSameDay(new Date(apt.start_time), date) && this.matchesFilters(apt, filters),
      )

      const availableSlots = this.generateDaySlots(date, dayAppointments, filters.duration)

      return {
        date,
        hasAvailability: availableSlots.some((slot) => slot.available),
        availableSlots,
      }
    })
  }

  /**
   * Generate time slots for a specific day
   */
  private generateDaySlots(date: Date, appointments: Appointment[], duration: number): TimeSlot[] {
    const slots: TimeSlot[] = []
    const startHour = this.businessHours.start
    const endHour = this.businessHours.end
    const slotDuration = this.businessHours.slotDuration

    // Generate all possible slots for the day
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = setMinutes(setHours(date, hour), minute)
        const slotEnd = addMinutes(slotStart, duration)

        // Check if slot end time is within business hours
        if (slotEnd.getHours() > endHour) {
          continue
        }

        const timeString = format(slotStart, "HH:mm")
        const conflicts = this.countConflicts(slotStart, slotEnd, appointments)

        slots.push({
          time: timeString,
          available: conflicts === 0,
          conflictCount: conflicts,
        })
      }
    }

    return slots
  }

  /**
   * Count appointment conflicts for a time slot
   */
  private countConflicts(slotStart: Date, slotEnd: Date, appointments: Appointment[]): number {
    return appointments.filter((apt) => {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(apt.end_time)

      // Check for overlap
      return (
        (isAfter(slotStart, aptStart) && isBefore(slotStart, aptEnd)) ||
        (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
        (isBefore(slotStart, aptStart) && isAfter(slotEnd, aptEnd))
      )
    }).length
  }

  /**
   * Check if appointment matches the given filters
   */
  private matchesFilters(appointment: Appointment, filters: TimeFinderFilters): boolean {
    if (filters.practitioner && appointment.diary !== filters.practitioner) {
      return false
    }

    if (filters.location && appointment.location !== filters.location) {
      return false
    }

    // Resource filtering would need additional appointment data
    // This is a placeholder for resource-based filtering

    return true
  }

  /**
   * Get available time slots for a specific date
   */
  getAvailableSlotsForDate(
    date: Date,
    appointments: Appointment[],
    duration: number,
    filters: Omit<TimeFinderFilters, "duration">,
  ): TimeSlot[] {
    const dayAppointments = appointments.filter(
      (apt) => isSameDay(new Date(apt.start_time), date) && this.matchesFilters(apt, { ...filters, duration }),
    )

    return this.generateDaySlots(date, dayAppointments, duration)
  }
}

export const timeFinderService = new TimeFinderService()
