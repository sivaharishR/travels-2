import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculateFare,
  generateBookingRef,
  MIN_TRIP_KM,
  MAX_TRIP_KM,
} from "@/lib/fare";
import { notifyAdminNewBooking } from "@/lib/mailer";

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
//   tripType ("ONE_WAY" | "ROUND_TRIP"), cabType, passengers?, distanceKm
// }
// Note: no pickup time or waiting time — the team schedules the departure
// with the customer by phone after booking.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const passengerName = String(body.passengerName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const pickupLocation = String(body.pickupLocation ?? "").trim();
    const dropLocation = String(body.dropLocation ?? "").trim();
    const cabType = String(body.cabType ?? "").trim();
    const tripType =
      String(body.tripType ?? "ONE_WAY").trim().toUpperCase() === "ROUND_TRIP"
        ? "ROUND_TRIP"
        : "ONE_WAY";
    const passengers = Math.max(1, Math.min(6, Number(body.passengers) || 1));
    const distanceKm = Number(body.distanceKm) || 0;

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
    if (!distanceKm || distanceKm <= 0) {
      errors.push("Trip distance must be greater than 0");
    } else if (distanceKm < MIN_TRIP_KM) {
      // Both one-way and round trips share the same 150 km minimum
      errors.push(`Trips have a minimum distance of ${MIN_TRIP_KM} km`);
    } else if (distanceKm > MAX_TRIP_KM) {
      errors.push(`Trip distance cannot exceed ${MAX_TRIP_KM} km`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const fare = calculateFare(cabType, distanceKm, tripType);

    const booking = await db.booking.create({
      data: {
        bookingRef: generateBookingRef(),
        passengerName,
        phone,
        email,
        pickupLocation,
        dropLocation,
        tripType,
        cabType,
        passengers,
        distanceKm,
        baseFare: fare.baseFare,
        perKmRate: fare.perKmRate,
        distanceFare: fare.distanceFare,
        totalFare: fare.totalFare,
        status: "CONFIRMED",
      },
    });

    await db.activityLog.create({
      data: {
        type: "BOOKING_CREATED",
        message: `Booking ${booking.bookingRef} created — ${passengerName}, ${pickupLocation} → ${dropLocation} (${cabType}, ${tripType === "ROUND_TRIP" ? "round trip, " : ""}₹${fare.totalFare})`,
        bookingRef: booking.bookingRef,
      },
    });

    // Notify the admin by email (Gmail SMTP). Fire-and-forget with full
    // error handling inside — booking response never waits on email.
    void notifyAdminNewBooking(booking).catch((err) =>
      console.error("Admin email notification error:", err)
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Create booking error:", err);
    return NextResponse.json(
      { error: "Failed to create booking", details: message },
      { status: 500 }
    );
  }
}
