"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface TenantInfo {
  id: string
  name: string
  subdomain: string
  settings?: Record<string, any>
}

interface TenantContextType {
  tenant: TenantInfo | null
  setTenant: (tenant: TenantInfo) => void
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({
  children,
  initialTenant,
}: {
  children: React.ReactNode
  initialTenant?: TenantInfo
}) {
  const [tenant, setTenant] = useState<TenantInfo | null>(initialTenant || null)
  const [isLoading, setIsLoading] = useState(!initialTenant)

  useEffect(() => {
    if (!initialTenant) {
      // Fetch tenant info from API
      fetch("/api/tenant/current")
        .then((res) => res.json())
        .then((data) => {
          setTenant(data)
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
    }
  }, [initialTenant])

  return <TenantContext.Provider value={{ tenant, setTenant, isLoading }}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider")
  }
  return context
}
