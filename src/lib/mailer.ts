import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { CAB_TYPES } from "@/lib/fare";

// Accepts either the client-side Booking type (string dates) or a raw
// Prisma booking record (Date objects).
export interface BookingLike {
  bookingRef: string;
  passengerName: string;
  phone: string;
  email?: string | null;
  pickupLocation: string;
  dropLocation: string;
  dropLocations?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  returnDate?: string | null;
  returnTime?: string | null;
  tripType?: string | null;
  cabType: string;
  passengers: number;
  distanceKm: number;
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
  totalFare: number;
}

// Helper to extract drop locations array
function getDropList(b: BookingLike): string[] {
  if (b.dropLocations) {
    try {
      const parsed = JSON.parse(b.dropLocations);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      const parts = b.dropLocations.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
  }
  return b.dropLocation ? [b.dropLocation] : [];
}

// Server-only mailer: notifies the admin by email whenever a new cab
// booking is created. Delivery status is always recorded in EmailLog
// (and surfaced in the admin dashboard), even when SMTP is not configured.

const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";

/**
 * Fallback credentials from email.config.json (git-ignored).
 * Safety net for environments where .env gets reset by tooling —
 * email delivery should never silently stop working.
 */
function readConfigFileFallback(): { user: string; pass: string; admin: string } {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "email.config.json"), "utf8");
    const cfg = JSON.parse(raw) as Record<string, string>;
    return {
      user: cfg.SMTP_USER ?? "",
      pass: cfg.SMTP_PASS ?? "",
      admin: cfg.ADMIN_EMAILS ?? cfg.ADMIN_EMAIL ?? "",
    };
  } catch {
    return { user: "", pass: "", admin: "" };
  }
}

const fileFallback = readConfigFileFallback();
const EMAIL_FROM = SMTP_USER || fileFallback.user;
const EMAIL_PASS = SMTP_PASS || fileFallback.pass;

// Comma separated list of admin addresses that receive every booking
// notification (e.g. "a@gmail.com,b@gmail.com").
const DEFAULT_RECIPIENTS = ["sivaharish2k1@gmail.com", "vaitheeswaratravels@gmail.com"];

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

const RECIPIENTS: string[] =
  parseRecipients(process.env.ADMIN_EMAILS).length > 0
    ? parseRecipients(process.env.ADMIN_EMAILS)
    : parseRecipients(process.env.ADMIN_EMAIL).length > 0
      ? parseRecipients(process.env.ADMIN_EMAIL)
      : parseRecipients(fileFallback.admin).length > 0
        ? parseRecipients(fileFallback.admin)
        : DEFAULT_RECIPIENTS;

const EMAIL_TO = RECIPIENTS.join(", ");

export const EMAIL_RECIPIENT = EMAIL_TO;

export function isEmailConfigured(): boolean {
  return Boolean(EMAIL_FROM && EMAIL_PASS);
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!cachedTransporter) {
    const isGmail =
      SMTP_HOST.toLowerCase().includes("gmail") ||
      EMAIL_FROM.toLowerCase().endsWith("@gmail.com");

    cachedTransporter = isGmail
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        })
      : nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
  }
  return cachedTransporter;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateTime(d: Date | string | null): string {
  if (!d) return "Flexible — we'll call to schedule";
  return new Date(d).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildEmailHtml(b: BookingLike): string {
  const cab = CAB_TYPES.find((c) => c.id === b.cabType);
  const isRoundTrip = b.tripType === "ROUND_TRIP";
  const drops = getDropList(b);
  const pickupDateTimeStr = [b.pickupDate, b.pickupTime].filter(Boolean).join(" at ");
  const returnDateTimeStr = isRoundTrip && [b.returnDate, b.returnTime].filter(Boolean).join(" at ");

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 12px;color:#737373;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;color:#171717;font-size:14px;font-weight:600;text-align:right;">${value}</td>
    </tr>`;

  const dropHtml =
    drops.length > 1
      ? drops
          .map(
            (loc, i) =>
              `<div style="margin-bottom:4px;"><span style="color:#f59e0b;font-weight:700;">Drop ${i + 1}:</span> ${loc}</div>`
          )
          .join("")
      : b.dropLocation;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fbbf24;border-radius:16px 16px 0 0;padding:20px 24px;">
      <span style="font-size:20px;font-weight:800;color:#171717;">🚕 Vaitheeshwara One Way Drop Taxi — New Booking</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#525252;">
        A new ride has been booked. Details below:
      </p>

      <div style="background:#fef3c7;border:2px dashed #fbbf24;border-radius:12px;padding:12px;text-align:center;margin-bottom:16px;">
        <div style="font-size:11px;letter-spacing:1px;color:#92700c;font-weight:700;">BOOKING REFERENCE</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:3px;color:#171717;font-family:monospace;">${b.bookingRef}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;">
        ${row("Passenger", b.passengerName)}
        ${row("Phone", b.phone)}
        ${b.email ? row("Email", b.email) : ""}
        ${row("Trip type", isRoundTrip ? "Round trip ↔" : "One way")}
        ${pickupDateTimeStr ? row("Pickup Date & Time", pickupDateTimeStr) : ""}
        ${returnDateTimeStr ? row("Return Date & Time", returnDateTimeStr) : ""}
        ${row("Pickup", b.pickupLocation)}
        ${row(drops.length > 1 ? "Drop Locations" : "Drop", dropHtml)}
        ${row("Cab", `${cab?.name ?? b.cabType} (${b.passengers} pax)`)}
        ${row("Distance", `${b.distanceKm} km${isRoundTrip ? " (total)" : ""}`)}
        ${row("Fare breakdown", `Base ${formatINR(b.baseFare)} + Distance ${formatINR(b.distanceFare)}`)}
        ${row("Total fare", formatINR(b.totalFare))}
      </table>

      <p style="margin:16px 0 0;font-size:12px;color:#a3a3a3;text-align:center;">
        Sent automatically by Vaitheeshwara One Way Drop Taxi · Support: 9342245360, 9600859515 · ${formatDateTime(new Date())}
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(b: BookingLike): string {
  const cab = CAB_TYPES.find((c) => c.id === b.cabType);
  const isRoundTrip = b.tripType === "ROUND_TRIP";
  const drops = getDropList(b);
  const pickupDateTimeStr = [b.pickupDate, b.pickupTime].filter(Boolean).join(" at ");
  const returnDateTimeStr = isRoundTrip && [b.returnDate, b.returnTime].filter(Boolean).join(" at ");

  return [
    `New Vaitheeshwara One Way Drop Taxi booking ${b.bookingRef}`,
    `Passenger: ${b.passengerName} (${b.phone})`,
    `Trip type: ${isRoundTrip ? "Round trip" : "One way"}`,
    pickupDateTimeStr ? `Pickup Date & Time: ${pickupDateTimeStr}` : null,
    returnDateTimeStr ? `Return Date & Time: ${returnDateTimeStr}` : null,
    `Pickup: ${b.pickupLocation}`,
    drops.length > 1
      ? `Drop locations:\n${drops.map((loc, i) => `  - Stop ${i + 1}: ${loc}`).join("\n")}`
      : `Drop: ${b.dropLocation}`,
    `Cab: ${cab?.name ?? b.cabType}, ${b.passengers} passenger(s)`,
    `Distance: ${b.distanceKm} km`,
    `Total fare: ${formatINR(b.totalFare)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sends the "new booking" notification email to the admin.
 * Never throws — always records the outcome in EmailLog + ActivityLog.
 * Fire-and-forget friendly.
 */
export async function notifyAdminNewBooking(booking: BookingLike): Promise<void> {
  const isRoundTrip = booking.tripType === "ROUND_TRIP";
  const subject = `🚕 ${isRoundTrip ? "Round trip" : "New booking"} ${booking.bookingRef} — ${booking.passengerName} (${formatINR(booking.totalFare)})`;
  const html = buildEmailHtml(booking);
  const text = buildEmailText(booking);

  let status = "FAILED";
  let error: string | null = null;

  try {
    const transporter = getTransporter();
    if (!transporter) {
      status = "SKIPPED";
      error =
        "SMTP not configured — set SMTP_USER and SMTP_PASS in .env to enable real email delivery";
    } else {
      await transporter.sendMail({
        from: `"Vaitheeshwara One Way Drop Taxi" <${EMAIL_FROM}>`,
        to: EMAIL_TO,
        subject,
        text,
        html,
      });
      status = "SENT";
    }
  } catch (err) {
    status = "FAILED";
    error = err instanceof Error ? err.message : "Unknown SMTP error";
  }

  try {
    await db.emailLog.create({
      data: {
        toAddress: EMAIL_TO,
        subject,
        status,
        error,
        bookingRef: booking.bookingRef,
      },
    });

    const activityType =
      status === "SENT" ? "EMAIL_SENT" : status === "SKIPPED" ? "EMAIL_SKIPPED" : "EMAIL_FAILED";
    await db.activityLog.create({
      data: {
        type: activityType,
        message:
          status === "SENT"
            ? `Booking notification emailed to ${EMAIL_TO} for ${booking.bookingRef}`
            : status === "SKIPPED"
              ? `Email notification for ${booking.bookingRef} skipped — SMTP not configured`
              : `Email notification for ${booking.bookingRef} failed: ${error ?? "unknown error"}`,
        bookingRef: booking.bookingRef,
      },
    });
  } catch (logErr) {
    console.error("Failed to record email log:", logErr);
  }
}
