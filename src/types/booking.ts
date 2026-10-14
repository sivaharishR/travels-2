// Shared types between client and server

export interface Booking {
  id: string;
  bookingRef: string;
  passengerName: string;
  phone: string;
  email: string | null;
  pickupLocation: string;
  dropLocation: string;
  dropLocations?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  returnDate?: string | null;
  returnTime?: string | null;
  tripType: string;
  cabType: string;
  passengers: number;
  distanceKm: number;
  baseFare: number;
  perKmRate: number;
  distanceFare: number;
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
  totalFare: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  bookingRef: string | null;
  createdAt: string;
}

export interface EmailEntry {
  id: string;
  toAddress: string;
  subject: string;
  status: string;
  error: string | null;
  bookingRef: string | null;
  createdAt: string;
}

export interface AdminStats {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  roundTrips: number;
  revenue: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  bookings: Booking[];
  activities: ActivityEntry[];
  emailLogs: EmailEntry[];
}
