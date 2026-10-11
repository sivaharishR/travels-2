// Shared fare calculation logic for the cab booking app.
// Used by both the estimate API and the booking creation API
// so pricing is always consistent (never trust client-side math).

export type CabTypeId = "sedan" | "suv" | "luxury";

export interface CabType {
  id: CabTypeId;
  name: string;
  description: string;
  seats: number;
  baseFare: number; // fixed opening fare
  perKm: number; // cost per km for one-way trips
  perKmRoundTrip?: number; // discounted per-km rate for round trips (falls back to perKm)
  icon: string; // emoji used in the UI
}

export const CAB_TYPES: CabType[] = [
  {
    id: "sedan",
    name: "Sedan",
    description: "Comfortable AC sedans for everyday travel",
    seats: 4,
    baseFare: 75,
    perKm: 14,
    icon: "🚙",
  },
  {
    id: "suv",
    name: "SUV",
    description: "Extra space for families and luggage",
    seats: 6,
    baseFare: 110,
    perKm: 19,
    icon: "🚐",
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Premium cars for a first-class experience",
    seats: 4,
    baseFare: 180,
    perKm: 28,
    icon: "🏎️",
  },
];

// Trip distance policy — applies to BOTH one-way and round trips:
// minimum 150 km, and a generous sanity cap ("no maximum" for customers —
// the cap only guards against data errors)
export const MIN_TRIP_KM = 150;
export const MAX_TRIP_KM = 5000;

export function getCabType(id: string): CabType | undefined {
  return CAB_TYPES.find((c) => c.id === id);
}

export interface FareBreakdown {
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
  totalFare: number;
}

export function calculateFare(
  cabTypeId: string,
  distanceKm: number,
  tripType: "ONE_WAY" | "ROUND_TRIP" = "ONE_WAY"
): FareBreakdown {
  const cab = getCabType(cabTypeId) ?? CAB_TYPES[0];
  const safeDistance = Math.max(1, Math.min(MAX_TRIP_KM, distanceKm || 0));

  // Round trips may use a discounted per-km rate when defined; currently
  // both trip types share the same published chart rate (perKm).
  const perKmRate =
    tripType === "ROUND_TRIP" ? (cab.perKmRoundTrip ?? cab.perKm) : cab.perKm;

  const distanceFare = round2(safeDistance * perKmRate);
  const totalFare = round2(cab.baseFare + distanceFare);

  return {
    baseFare: cab.baseFare,
    perKmRate,
    distanceFare,
    totalFare,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Generates a short human friendly booking reference, e.g. VT-8F3K2D
export function generateBookingRef(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `VT-${code}`;
}
