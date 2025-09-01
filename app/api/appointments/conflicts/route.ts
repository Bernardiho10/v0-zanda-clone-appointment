import { type NextRequest, NextResponse } from "next/server"
import { AppointmentService } from "@/lib/appointments"
import { z } from "zod"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

const conflictCheckSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  diary: z.string().optional(),
  exclude_appointment_id: z.number().optional(),
})

// POST /api/appointments/conflicts - Check for appointment conflicts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = conflictCheckSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      )
    }

    const appointmentService = new AppointmentService(MOCK_TENANT_ID)

    const hasConflict = await appointmentService.checkConflict(
      validationResult.data.start_time,
      validationResult.data.end_time,
      validationResult.data.diary,
      validationResult.data.exclude_appointment_id,
    )

    return NextResponse.json({
      success: true,
      has_conflict: hasConflict,
      message: hasConflict ? "Conflict detected" : "No conflicts found",
    })
  } catch (error) {
    console.error("Failed to check appointment conflicts:", error)
    return NextResponse.json(
      {
        error: "Failed to check appointment conflicts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
