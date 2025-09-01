import type { Appointment, Client, CreateAppointmentData, UpdateAppointmentData } from "@/types/appointment"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: any
  message?: string
  count?: number
  total?: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Appointment endpoints
  async getAppointments(startDate: string, endDate: string): Promise<Appointment[]> {
    const params = new URLSearchParams({ startDate, endDate })
    const response = await this.request<Appointment[]>(`/appointments?${params}`)
    return response.data || []
  }

  async getAppointment(id: number): Promise<Appointment | null> {
    try {
      const response = await this.request<Appointment>(`/appointments/${id}`)
      return response.data || null
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null
      }
      throw error
    }
  }

  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const response = await this.request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async updateAppointment(id: number, data: Partial<UpdateAppointmentData>): Promise<Appointment> {
    const response = await this.request<Appointment>(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    return response.data!
  }

  async deleteAppointment(id: number, reason?: string): Promise<void> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : ""
    await this.request(`/appointments/${id}${params}`, {
      method: "DELETE",
    })
  }

  async updateAppointmentStatus(id: number, status: string, reason?: string): Promise<Appointment> {
    const response = await this.request<Appointment>(`/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    })
    return response.data!
  }

  async checkAppointmentConflict(
    startTime: string,
    endTime: string,
    diary?: string,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    const response = await this.request<{ has_conflict: boolean }>("/appointments/conflicts", {
      method: "POST",
      body: JSON.stringify({
        start_time: startTime,
        end_time: endTime,
        diary,
        exclude_appointment_id: excludeAppointmentId,
      }),
    })
    return response.data?.has_conflict || false
  }

  // Client endpoints
  async getClients(search?: string, limit = 50): Promise<Client[]> {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("limit", limit.toString())

    const response = await this.request<Client[]>(`/clients?${params}`)
    return response.data || []
  }

  async getClient(id: number): Promise<Client | null> {
    try {
      const response = await this.request<Client>(`/clients/${id}`)
      return response.data || null
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null
      }
      throw error
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
export default apiClient
