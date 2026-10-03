"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  MapPin,
  Navigation,
  RefreshCw,
  XCircle,
  CarTaxiFront,
  Clock,
  CalendarClock,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CAB_TYPES } from "@/lib/fare";
import type { Booking } from "@/types/booking";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED") {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Confirmed
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        Cancelled
      </Badge>
    );
  }
  if (status === "COMPLETED") {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
        Completed
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

export function RecentBookings({ version }: { version: number }) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bookings");
      setBookings(data.bookings);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, version]);

  const cancelBooking = async (booking: Booking) => {
    setCancellingId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel booking");
      setBookings((prev) =>
        prev
          ? prev.map((b) => (b.id === booking.id ? { ...b, status: "CANCELLED" } : b))
          : prev
      );
      toast({
        title: "Booking cancelled",
        description: `${booking.bookingRef} has been cancelled.`,
      });
    } catch (err) {
      toast({
        title: "Could not cancel",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Recent bookings</CardTitle>
            <CardDescription>
              Your latest rides — cancel any time before pickup.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadBookings}
            aria-label="Refresh bookings"
            className="cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !bookings ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground">
              Book your first ride using the form above.
            </p>
          </div>
        ) : (
          <ul className="custom-scrollbar max-h-96 space-y-3 overflow-y-auto pr-1">
            {bookings.map((b) => {
              const cab = CAB_TYPES.find((c) => c.id === b.cabType);
              return (
                <li
                  key={b.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
                    b.status === "CANCELLED" ? "opacity-60" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                      <span className="font-mono text-xs font-bold tracking-widest text-amber-700">
                        {b.bookingRef}
                      </span>
                      <StatusBadge status={b.status} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CarTaxiFront className="size-3.5" />
                        {cab?.name ?? b.cabType} · {b.passengers}{" "}
                        {b.passengers === 1 ? "passenger" : "passengers"}
                      </span>
                    </div>
                    <div className="grid gap-1 text-sm sm:grid-cols-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">{b.pickupLocation}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Navigation className="size-3.5 shrink-0 text-rose-600" />
                        <span className="truncate">{b.dropLocation}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3.5" />
                        {format(new Date(b.pickupTime), "EEE, d MMM · h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        Wait: {b.waitingMinutes} min
                      </span>
                      <span>
                        {b.distanceKm} km
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                    <span className="text-lg font-bold">
                      {formatINR(b.totalFare)}
                    </span>
                    {b.status === "CONFIRMED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={cancellingId === b.id}
                        onClick={() => cancelBooking(b)}
                        className="cursor-pointer gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="size-4" />
                        {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
