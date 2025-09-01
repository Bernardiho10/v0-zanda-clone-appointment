"use client"

import { useState, useEffect } from "react"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { DashboardCards } from "@/components/dashboard/dashboard-cards"
import {
  DashboardAnalyticsService,
  type DashboardFilters as FilterType,
  type DashboardData,
} from "@/lib/dashboard-analytics"
import { startOfMonth, endOfMonth } from "date-fns"

// Mock tenant ID - in real app this would come from auth/context
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterType>({
    dateRange: {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    },
    practitioner: undefined,
    location: undefined,
  })

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const analyticsService = new DashboardAnalyticsService(MOCK_TENANT_ID)

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getDashboardData(filters)
      setDashboardData(data)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleApplyFilters = () => {
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b">
        <div className="flex items-center justify-between p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <DashboardFilters filters={filters} onFiltersChange={setFilters} onApply={handleApplyFilters} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DashboardCards data={dashboardData} />
      </div>
    </div>
  )
}
