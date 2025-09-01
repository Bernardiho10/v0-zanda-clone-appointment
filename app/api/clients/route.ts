import { type NextRequest, NextResponse } from "next/server"
import { AppointmentService } from "@/lib/appointments"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

// GET /api/clients - List clients with optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const appointmentService = new AppointmentService(MOCK_TENANT_ID)
    const clients = await appointmentService.getClients(search || undefined)

    // Apply limit
    const limitedClients = clients.slice(0, limit)

    return NextResponse.json({
      success: true,
      data: limitedClients,
      count: limitedClients.length,
      total: clients.length,
    })
  } catch (error) {
    console.error("Failed to fetch clients:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
