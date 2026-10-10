import { NextRequest, NextResponse } from "next/server";
import { CAB_TYPES, calculateFare } from "@/lib/fare";

// POST /api/estimate
// Body: { distanceKm: number, tripType?: "ONE_WAY" | "ROUND_TRIP" }
// Returns fare breakdown for every cab type so the UI can show a comparison.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const distanceKm = Number(body.distanceKm) || 0;
    const tripType =
      String(body.tripType ?? "ONE_WAY").trim().toUpperCase() === "ROUND_TRIP"
        ? "ROUND_TRIP"
        : "ONE_WAY";

    if (distanceKm <= 0) {
      return NextResponse.json(
        { error: "distanceKm must be greater than 0" },
        { status: 400 }
      );
    }

    const estimates = CAB_TYPES.map((cab) => ({
      cabTypeId: cab.id,
      name: cab.name,
      icon: cab.icon,
      seats: cab.seats,
      description: cab.description,
      ...calculateFare(cab.id, distanceKm, tripType),
    }));

    return NextResponse.json({ estimates });
  } catch (err) {
    console.error("Estimate error:", err);
    return NextResponse.json(
      { error: "Failed to calculate fare estimate" },
      { status: 500 }
    );
  }
}
