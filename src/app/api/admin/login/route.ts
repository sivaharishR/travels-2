import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyCredentials,
  isRateLimited,
  markFailedAttempt,
  issueToken,
} from "@/lib/admin-auth";

// POST /api/admin/login
// Body: { username, password }
// Returns { token } on success. Token must be sent as `Authorization: Bearer <token>`
// to admin-only endpoints.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");

    if (isRateLimited()) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (!verifyCredentials(username, password)) {
      markFailedAttempt();
      await db.activityLog.create({
        data: {
          type: "ADMIN_LOGIN_FAILED",
          message: `Failed admin login attempt for username "${username.trim().slice(0, 40)}"`,
          bookingRef: null,
        },
      });
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = issueToken();
    await db.activityLog.create({
      data: {
        type: "ADMIN_LOGIN",
        message: `Admin "${username.trim()}" signed in`,
        bookingRef: null,
      },
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
