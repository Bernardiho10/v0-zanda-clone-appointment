import { cookies } from "next/headers"

export interface TenantInfo {
  id: string
  name: string
  subdomain: string
  settings?: Record<string, any>
}

export async function getCurrentTenant(): Promise<TenantInfo> {
  // In a real implementation, this would extract tenant info from:
  // - Subdomain (e.g., clinic1.zanda.com)
  // - JWT token
  // - Session data
  // For now, we'll use a mock implementation

  const cookieStore = cookies()
  const tenantId = cookieStore.get("tenant-id")?.value

  if (!tenantId) {
    // In production, redirect to tenant selection or login
    return {
      id: "default-tenant",
      name: "Bodymotions Physio Lounge",
      subdomain: "bodymotions",
    }
  }

  return {
    id: tenantId,
    name: "Bodymotions Physio Lounge",
    subdomain: "bodymotions",
  }
}

export function setTenantCookie(tenantId: string) {
  const cookieStore = cookies()
  cookieStore.set("tenant-id", tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}
