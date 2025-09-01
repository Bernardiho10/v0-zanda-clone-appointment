import { type NextRequest, NextResponse } from "next/server"
import { AppointmentService } from "@/lib/appointments"
import { z } from "zod"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

interface RouteParams {
  params: {
    id: string
  }
}

const statusUpdateSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled", "No Show", "Rescheduled", "In Progress"]),
  reason: z.string().optional(),
})

// PATCH /api/appointments/[id]/status - Update appointment status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const appointmentId = Number.parseInt(params.id)

    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
    }

    const body = await request.json()
    const validationResult = statusUpdateSchema.safeParse(body)

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

    // Check if appointment exists
    const existingAppointment = await appointmentService.getAppointment(appointmentId)
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Handle cancellation with reason
    if (validationResult.data.status === "Cancelled") {
      await appointmentService.deleteAppointment(appointmentId, validationResult.data.reason || "Cancelled")
      return NextResponse.json({
        success: true,
        message: "Appointment cancelled successfully",
      })
    }

    // Update appointment status
    const updatedAppointment = await appointmentService.updateAppointment({
      appointment_id: appointmentId,
      appointment_status_id: validationResult.data.status,
    })

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: `Appointment status updated to ${validationResult.data.status}`,
    })
  } catch (error) {
    console.error("Failed to update appointment status:", error)
    return NextResponse.json(
      {
        error: "Failed to update appointment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
