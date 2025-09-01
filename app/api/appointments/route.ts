import { type NextRequest, NextResponse } from "next/server"
import { AppointmentService } from "@/lib/appointments"
import { appointmentFormSchema } from "@/lib/validation/appointment"

// Mock tenant ID - in real app this would come from auth/session
const MOCK_TENANT_ID = "123e4567-e89b-12d3-a456-426614174000"

// GET /api/appointments - List appointments with optional date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate query parameters are required" }, { status: 400 })
    }

    const appointmentService = new AppointmentService(MOCK_TENANT_ID)
    const appointments = await appointmentService.getAppointments(startDate, endDate)

    return NextResponse.json({
      success: true,
      data: appointments,
      count: appointments.length,
    })
  } catch (error) {
    console.error("Failed to fetch appointments:", error)
    return NextResponse.json(
      { error: "Failed to fetch appointments", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = appointmentFormSchema.safeParse(body)
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

    // Check for conflicts
    const hasConflict = await appointmentService.checkConflict(
      validationResult.data.start_time,
      validationResult.data.end_time,
      validationResult.data.diary,
    )

    if (hasConflict) {
      return NextResponse.json(
        { error: "Appointment conflict detected. Another appointment exists at this time." },
        { status: 409 },
      )
    }

    // Create appointment
    const appointment = await appointmentService.createAppointment({
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

    return NextResponse.json(
      {
        success: true,
        data: appointment,
        message: "Appointment created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to create appointment:", error)
    return NextResponse.json(
      { error: "Failed to create appointment", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
