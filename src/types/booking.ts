// Shared types between client and server

export interface Booking {
  id: string;
  bookingRef: string;
  passengerName: string;
  phone: string;
  email: string | null;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  cabType: string;
  passengers: number;
  distanceKm: number;
  waitingMinutes: number;
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
  waitingCharge: number;
  totalFare: number;
  status: string;
  createdAt: string;
}

export interface FareEstimate {
  cabTypeId: string;
  name: string;
  icon: string;
  seats: number;
  description: string;
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
  waitingMinutes: number;
  billableWaitingMinutes: number;
  waitingCharge: number;
  totalFare: number;
}
