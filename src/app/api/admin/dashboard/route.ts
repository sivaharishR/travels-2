import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, validateToken } from "@/lib/admin-auth";

// GET /api/admin/dashboard — admin-only.
// Returns all bookings, the activity log and summary stats.
export async function GET(request: NextRequest) {
  try {
    const token = extractBearer(request.headers.get("authorization"));
    if (!validateToken(token)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [bookings, activities] = await Promise.all([
      db.booking.findMany({ orderBy: { createdAt: "desc" } }),
      db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 150 }),
    ]);

    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const completed = bookings.filter((b) => b.status === "COMPLETED").length;
    const revenue = bookings
      .filter((b) => b.status !== "CANCELLED")
      .reduce((sum, b) => sum + b.totalFare, 0);
    const totalWaitingMinutes = bookings.reduce(
      (sum, b) => sum + b.waitingMinutes,
      0
    );

    return NextResponse.json({
      stats: {
        total: bookings.length,
        confirmed,
        cancelled,
        completed,
        revenue: Math.round(revenue * 100) / 100,
        totalWaitingMinutes,
      },
      bookings,
      activities,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
