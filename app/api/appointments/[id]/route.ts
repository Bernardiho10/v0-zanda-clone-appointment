import { type NextRequest, NextResponse } from "next/server"
import { AppointmentService } from "@/lib/appointments"
import { appointmentFormSchema } from "@/lib/validation/appointment"
import { z } from "zod"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/appointments/[id] - Get single appointment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const appointmentId = Number.parseInt(params.id)

    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
    }

    const appointmentService = new AppointmentService(MOCK_TENANT_ID)
    const appointment = await appointmentService.getAppointment(appointmentId)

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: appointment,
    })
  } catch (error) {
    console.error("Failed to fetch appointment:", error)
    return NextResponse.json(
      { error: "Failed to fetch appointment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// PUT /api/appointments/[id] - Update appointment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const appointmentId = Number.parseInt(params.id)

    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
    }

    const body = await request.json()

    // Create partial validation schema for updates
    const updateSchema = appointmentFormSchema.partial().extend({
      appointment_id: z.number(),
    })

    const validationResult = updateSchema.safeParse({
      ...body,
      appointment_id: appointmentId,
    })

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

    // Check for conflicts if time is being updated
    if (validationResult.data.start_time || validationResult.data.end_time) {
      const startTime = validationResult.data.start_time || existingAppointment.start_time
      const endTime = validationResult.data.end_time || existingAppointment.end_time
      const diary = validationResult.data.diary || existingAppointment.diary

      const hasConflict = await appointmentService.checkConflict(startTime, endTime, diary, appointmentId)

      if (hasConflict) {
        return NextResponse.json(
          { error: "Appointment conflict detected. Another appointment exists at this time." },
          { status: 409 },
        )
      }
    }

    // Update appointment
    const updatedAppointment = await appointmentService.updateAppointment({
      appointment_id: appointmentId,
      client_number: validationResult.data.client_number,
      start_time: validationResult.data.start_time,
      end_time: validationResult.data.end_time,
      appointment_status_id: validationResult.data.appointment_status_id,
      appointment_type_id: validationResult.data.appointment_type_id,
      location: validationResult.data.location,
      notes: validationResult.data.notes,
      appointment_title: validationResult.data.appointment_title,
      diary: validationResult.data.diary,
      schedule_reminder: validationResult.data.schedule_reminder,
    })

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: "Appointment updated successfully",
    })
  } catch (error) {
    console.error("Failed to update appointment:", error)
    return NextResponse.json(
      { error: "Failed to update appointment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// DELETE /api/appointments/[id] - Delete appointment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const appointmentId = Number.parseInt(params.id)

    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const reason = searchParams.get("reason") || "Cancelled"

    const appointmentService = new AppointmentService(MOCK_TENANT_ID)

    // Check if appointment exists
    const existingAppointment = await appointmentService.getAppointment(appointmentId)
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Soft delete appointment
    await appointmentService.deleteAppointment(appointmentId, reason)

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    })
  } catch (error) {
    console.error("Failed to delete appointment:", error)
    return NextResponse.json(
      { error: "Failed to delete appointment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
