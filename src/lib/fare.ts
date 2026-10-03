// Shared fare calculation logic for the cab booking app.
// Used by both the estimate API and the booking creation API
// so pricing is always consistent (never trust client-side math).

export type CabTypeId = "hatchback" | "sedan" | "suv" | "luxury";

export interface CabType {
  id: CabTypeId;
  name: string;
  description: string;
  seats: number;
  baseFare: number; // fixed opening fare
  perKm: number; // cost per km
  icon: string; // emoji used in the UI
}

export const CAB_TYPES: CabType[] = [
  {
    id: "hatchback",
    name: "Hatchback",
    description: "Budget friendly rides for short city trips",
    seats: 4,
    baseFare: 50,
    perKm: 12,
    icon: "🚗",
  },
  {
    id: "sedan",
    name: "Sedan",
    description: "Comfortable AC sedans for everyday travel",
    seats: 4,
    baseFare: 75,
    perKm: 15,
    icon: "🚙",
  },
  {
    id: "suv",
    name: "SUV",
    description: "Extra space for families and luggage",
    seats: 6,
    baseFare: 110,
    perKm: 20,
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

// Waiting time policy
export const FREE_WAITING_MINUTES = 5;
export const WAITING_CHARGE_PER_MIN = 2;

export function getCabType(id: string): CabType | undefined {
  return CAB_TYPES.find((c) => c.id === id);
}

export interface FareBreakdown {
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
  waitingMinutes: number;
  billableWaitingMinutes: number;
  waitingCharge: number;
  totalFare: number;
}

export function calculateFare(
  cabTypeId: string,
  distanceKm: number,
  waitingMinutes: number
): FareBreakdown {
  const cab = getCabType(cabTypeId) ?? CAB_TYPES[0];
  const safeDistance = Math.max(1, Math.min(500, distanceKm || 0));
  const safeWaiting = Math.max(0, Math.min(240, waitingMinutes || 0));

  const distanceFare = round2(safeDistance * cab.perKm);
  const billableWaitingMinutes = Math.max(
    0,
    safeWaiting - FREE_WAITING_MINUTES
  );
  const waitingCharge = round2(billableWaitingMinutes * WAITING_CHARGE_PER_MIN);

  const totalFare = round2(cab.baseFare + distanceFare + waitingCharge);

  return {
    baseFare: cab.baseFare,
    perKmRate: cab.perKm,
    distanceFare,
    waitingMinutes: safeWaiting,
    billableWaitingMinutes,
    waitingCharge,
    totalFare,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Generates a short human friendly booking reference, e.g. QC-8F3K2D
export function generateBookingRef(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `QC-${code}`;
}
