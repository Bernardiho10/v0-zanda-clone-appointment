"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type { Appointment, Client, CreateAppointmentData, UpdateAppointmentData } from "@/types/appointment"

interface UseAppointmentsOptions {
  startDate?: string
  endDate?: string
  autoFetch?: boolean
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { startDate, endDate, autoFetch = true } = options

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch appointments
  const fetchAppointments = async (start?: string, end?: string) => {
    if (!start || !end) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.getAppointments(start, end)
      setAppointments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch appointments")
    } finally {
      setLoading(false)
    }
  }

  // Fetch clients
  const fetchClients = async (search?: string) => {
    try {
      const data = await apiClient.getClients(search)
      setClients(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients")
      return []
    }
  }

  // Create appointment
  const createAppointment = async (data: CreateAppointmentData): Promise<Appointment> => {
    setLoading(true)
    setError(null)

    try {
      const appointment = await apiClient.createAppointment(data)
      setAppointments((prev) => [...prev, appointment])
      return appointment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update appointment
  const updateAppointment = async (id: number, data: Partial<UpdateAppointmentData>): Promise<Appointment> => {
    setLoading(true)
    setError(null)

    try {
      const appointment = await apiClient.updateAppointment(id, data)
      setAppointments((prev) => prev.map((a) => (a.appointment_id === id ? appointment : a)))
      return appointment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Delete appointment
  const deleteAppointment = async (id: number, reason?: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      await apiClient.deleteAppointment(id, reason)
      setAppointments((prev) => prev.filter((a) => a.appointment_id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete appointment")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update appointment status
  const updateAppointmentStatus = async (id: number, status: string, reason?: string): Promise<Appointment> => {
    setLoading(true)
    setError(null)

    try {
      const appointment = await apiClient.updateAppointmentStatus(id, status, reason)
      setAppointments((prev) => prev.map((a) => (a.appointment_id === id ? appointment : a)))
      return appointment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment status")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Check for conflicts
  const checkConflict = async (
    startTime: string,
    endTime: string,
    diary?: string,
    excludeAppointmentId?: number,
  ): Promise<boolean> => {
    try {
      return await apiClient.checkAppointmentConflict(startTime, endTime, diary, excludeAppointmentId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check conflicts")
      return false
    }
  }

  // Auto-fetch on mount and when dates change
  useEffect(() => {
    if (autoFetch && startDate && endDate) {
      fetchAppointments(startDate, endDate)
    }
  }, [startDate, endDate, autoFetch])

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
  }, [])

  return {
    appointments,
    clients,
    loading,
    error,
    fetchAppointments,
    fetchClients,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    checkConflict,
    refetch: () => fetchAppointments(startDate, endDate),
  }
}
