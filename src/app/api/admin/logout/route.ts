import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revokeToken, extractBearer, validateToken } from "@/lib/admin-auth";

// POST /api/admin/logout — revokes the current admin session token.
export async function POST(request: NextRequest) {
  try {
    const token = extractBearer(request.headers.get("authorization"));
    if (token && validateToken(token)) {
      revokeToken(token);
      await db.activityLog.create({
        data: {
          type: "ADMIN_LOGOUT",
          message: "Admin signed out",
          bookingRef: null,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin logout error:", err);
    return NextResponse.json({ ok: true });
  }
}
