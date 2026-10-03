import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/bookings/[id] - update booking status (cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status ?? "").trim().toUpperCase();

    if (!["CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await db.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = await db.booking.update({
      where: { id },
      data: { status },
    });

    if (existing.status !== status) {
      await db.activityLog.create({
        data: {
          type: status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_UPDATED",
          message: `Booking ${booking.bookingRef} status changed: ${existing.status} → ${status}`,
          bookingRef: booking.bookingRef,
        },
      });
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("Update booking error:", err);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
