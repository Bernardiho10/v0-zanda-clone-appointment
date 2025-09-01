import { type NextRequest, NextResponse } from "next/server"
import { queryWithTenant } from "@/lib/database"
import type { Client } from "@/types/appointment"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/clients/[id] - Get single client
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const clientNumber = Number.parseInt(params.id)

    if (isNaN(clientNumber)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
    }

    const query = `
      SELECT * FROM clients 
      WHERE client_number = $1 
        AND status = 'Active' 
        AND is_archived = false
    `

    const clients = await queryWithTenant<Client>(MOCK_TENANT_ID, query, [clientNumber])

    if (clients.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: clients[0],
    })
  } catch (error) {
    console.error("Failed to fetch client:", error)
    return NextResponse.json(
      { error: "Failed to fetch client", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
