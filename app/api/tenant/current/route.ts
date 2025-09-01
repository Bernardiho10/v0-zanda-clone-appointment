import { type NextRequest, NextResponse } from "next/server"
import { getCurrentTenant } from "@/lib/auth/tenant"

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    return NextResponse.json(tenant)
  } catch (error) {
    console.error("Error fetching current tenant:", error)
    return NextResponse.json({ error: "Failed to fetch tenant information" }, { status: 500 })
  }
}
