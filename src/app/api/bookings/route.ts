import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateFare, generateBookingRef } from "@/lib/fare";

// GET /api/bookings - list the most recent bookings
export async function GET() {
  try {
    const bookings = await db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("List bookings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings - create a new booking
// Body: {
//   passengerName, phone, email?, pickupLocation, dropLocation,
//   pickupTime (ISO string), cabType, passengers?, distanceKm, waitingMinutes
// }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const passengerName = String(body.passengerName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const pickupLocation = String(body.pickupLocation ?? "").trim();
    const dropLocation = String(body.dropLocation ?? "").trim();
    const cabType = String(body.cabType ?? "").trim();
    const passengers = Math.max(1, Math.min(6, Number(body.passengers) || 1));
    const distanceKm = Number(body.distanceKm) || 0;
    const waitingMinutes = Number(body.waitingMinutes) || 0;

    // --- Validation ---
    const errors: string[] = [];
    if (passengerName.length < 2)
      errors.push("Passenger name must be at least 2 characters");
    if (!/^[+\d][\d\s-]{6,15}$/.test(phone))
      errors.push("Please enter a valid phone number");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Please enter a valid email address");
    if (pickupLocation.length < 3)
      errors.push("Pickup location must be at least 3 characters");
    if (dropLocation.length < 3)
      errors.push("Drop location must be at least 3 characters");
    if (pickupLocation.toLowerCase() === dropLocation.toLowerCase())
      errors.push("Pickup and drop locations cannot be the same");
    if (!distanceKm || distanceKm <= 0)
      errors.push("Trip distance must be greater than 0");
    if (distanceKm > 500) errors.push("Trip distance cannot exceed 500 km");

    let pickupTime: Date | null = null;
    if (body.pickupTime) {
      const d = new Date(body.pickupTime);
      if (isNaN(d.getTime())) {
        errors.push("Invalid pickup date/time");
      } else {
        pickupTime = d;
      }
    } else {
      errors.push("Pickup date/time is required");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (!pickupTime) {
      return NextResponse.json(
        { error: "Pickup date/time is required" },
        { status: 400 }
      );
    }

    const fare = calculateFare(cabType, distanceKm, waitingMinutes);

    const booking = await db.booking.create({
      data: {
        bookingRef: generateBookingRef(),
        passengerName,
        phone,
        email,
        pickupLocation,
        dropLocation,
        pickupTime,
        cabType,
        passengers,
        distanceKm,
        waitingMinutes,
        baseFare: fare.baseFare,
        perKmRate: fare.perKmRate,
        distanceFare: fare.distanceFare,
        waitingCharge: fare.waitingCharge,
        totalFare: fare.totalFare,
        status: "CONFIRMED",
      },
    });

    await db.activityLog.create({
      data: {
        type: "BOOKING_CREATED",
        message: `Booking ${booking.bookingRef} created — ${passengerName}, ${pickupLocation} → ${dropLocation} (${cabType}, ₹${fare.totalFare})`,
        bookingRef: booking.bookingRef,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error("Create booking error:", err);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
