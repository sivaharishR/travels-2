"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Navigation,
  Users,
  Route,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeftRight,
  BadgeCheck,
  Info,
  Calendar,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CAB_TYPES,
  MIN_TRIP_KM,
  MAX_TRIP_KM,
} from "@/lib/fare";
import type { Booking } from "@/types/booking";

type TripType = "ONE_WAY" | "ROUND_TRIP";

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultTimeString(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const hours = String(now.getHours()).padStart(2, "0");
  return `${hours}:00`;
}

const formSchema = z.object({
  passengerName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,15}$/, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
  pickupLocation: z.string().trim().min(3, "Enter a pickup location"),
  dropLocation: z.string().optional(),
  pickupDate: z.string().min(1, "Select a pickup date"),
  pickupTime: z.string().min(1, "Select a pickup time"),
  returnDate: z.string().optional(),
  returnTime: z.string().optional(),
  passengers: z.string().min(1, "Select passengers"),
  tripType: z.enum(["ONE_WAY", "ROUND_TRIP"]),
});

type FormValues = z.infer<typeof formSchema>;

const TRIP_TYPE_CHIPS: { value: TripType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "ONE_WAY", label: "One way", icon: ArrowRight },
  { value: "ROUND_TRIP", label: "Round trip", icon: ArrowLeftRight },
];

export function BookingSection({ onBooked }: { onBooked?: () => void }) {
  const { toast } = useToast();
  const [cabType, setCabType] = useState<string>("sedan");
  const [distanceKm, setDistanceKm] = useState<number>(MIN_TRIP_KM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Multiple drop locations state for round trip
  const [roundTripDrops, setRoundTripDrops] = useState<string[]>([""]);
  const [roundTripDropError, setRoundTripDropError] = useState<string | null>(null);

  const todayStr = getTodayString();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengerName: "",
      phone: "",
      email: "",
      pickupLocation: "",
      dropLocation: "",
      pickupDate: todayStr,
      pickupTime: getDefaultTimeString(),
      returnDate: "",
      returnTime: "",
      passengers: "1",
      tripType: "ONE_WAY",
    },
  });

  const tripType = watch("tripType") as TripType;
  const isRoundTrip = tripType === "ROUND_TRIP";
  const pickupDateValue = watch("pickupDate");

  // Both one-way and round trips share the same distance bounds:
  // minimum 150 km, effectively no maximum (5000 km sanity cap server-side)
  const distanceMin = MIN_TRIP_KM;
  const distanceMax = MAX_TRIP_KM;

  const setTripType = (t: TripType) => {
    setValue("tripType", t, { shouldValidate: true });
    setDistanceKm((prev) => Math.max(distanceMin, Math.min(distanceMax, prev)));
    setRoundTripDropError(null);
  };

  const onSliderChange = (vals: number[]) => {
    setDistanceKm(Math.round(vals[0] * 1000) / 1000);
  };

  const onDistanceInput = (raw: string) => {
    const n = Number(raw);
    if (isNaN(n)) return;
    const clamped = Math.round(Math.max(distanceMin, Math.min(distanceMax, n)) * 1000) / 1000;
    setDistanceKm(clamped);
  };

  // Round trip drops management
  const updateRoundTripDrop = (index: number, val: string) => {
    setRoundTripDrops((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    setRoundTripDropError(null);
  };

  const addRoundTripDrop = () => {
    if (roundTripDrops.length >= 6) return;
    setRoundTripDrops((prev) => [...prev, ""]);
  };

  const removeRoundTripDrop = (index: number) => {
    setRoundTripDrops((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values: FormValues) => {
    // Validate drop locations
    let dropsPayload: string[] = [];
    if (isRoundTrip) {
      dropsPayload = roundTripDrops.map((d) => d.trim()).filter(Boolean);
      if (dropsPayload.length === 0) {
        setRoundTripDropError("Please enter at least one drop location for the round trip");
        return;
      }
      for (let i = 0; i < dropsPayload.length; i++) {
        if (dropsPayload[i].length < 2) {
          setRoundTripDropError(`Drop stop ${i + 1} must be at least 2 characters`);
          return;
        }
        if (dropsPayload[i].toLowerCase() === values.pickupLocation.trim().toLowerCase()) {
          setRoundTripDropError(`Drop location "${dropsPayload[i]}" cannot be the same as pickup`);
          return;
        }
      }
    } else {
      const singleDrop = (values.dropLocation ?? "").trim();
      if (singleDrop.length < 3) {
        toast({
          title: "Missing drop location",
          description: "Please enter a valid drop location (at least 3 characters).",
          variant: "destructive",
        });
        return;
      }
      dropsPayload = [singleDrop];
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerName: values.passengerName,
          phone: values.phone,
          email: values.email || null,
          pickupLocation: values.pickupLocation,
          dropLocation: dropsPayload.length > 1 ? dropsPayload.join(" → ") : dropsPayload[0],
          dropLocations: dropsPayload,
          pickupDate: values.pickupDate,
          pickupTime: values.pickupTime,
          returnDate: isRoundTrip && values.returnDate ? values.returnDate : null,
          returnTime: isRoundTrip && values.returnTime ? values.returnTime : null,
          tripType,
          cabType,
          passengers: Number(values.passengers),
          distanceKm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Could not confirm your booking");
      }
      setConfirmedBooking(data.booking as Booking);
      onBooked?.();
      toast({
        title: "Ride confirmed 🚕",
        description: `Booking ${data.booking.bookingRef} confirmed for ${values.pickupDate} at ${values.pickupTime}!`,
      });
      reset({
        passengerName: "",
        phone: "",
        email: "",
        pickupLocation: "",
        dropLocation: "",
        pickupDate: todayStr,
        pickupTime: getDefaultTimeString(),
        returnDate: "",
        returnTime: "",
        passengers: "1",
        tripType,
      });
      setRoundTripDrops([""]);
      setRoundTripDropError(null);
      setDistanceKm(MIN_TRIP_KM);
    } catch (err) {
      toast({
        title: "Booking failed",
        description:
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="book" className="mx-auto w-full max-w-3xl">
      <Card className="gap-6 py-6 shadow-md border-amber-200/60">
        <CardHeader>
          <CardTitle className="text-xl">Book your ride</CardTitle>
          <CardDescription>
            Fill in your trip details and schedule — confirmed instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Passenger details */}
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Passenger details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passengerName">Full name *</Label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="passengerName"
                      placeholder="e.g. Priya Sharma"
                      className="pl-9"
                      aria-invalid={!!errors.passengerName}
                      {...register("passengerName")}
                    />
                  </div>
                  {errors.passengerName && (
                    <p className="text-xs text-destructive">{errors.passengerName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number *</Label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9"
                      aria-invalid={!!errors.phone}
                      {...register("phone")}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      aria-invalid={!!errors.email}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Trip details */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Trip details &amp; Schedule
              </h3>

              {/* Trip type selector */}
              <div className="space-y-2">
                <Label>Trip type</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Trip type">
                  {TRIP_TYPE_CHIPS.map(({ value, label, icon: Icon }) => {
                    const active = tripType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTripType(value)}
                        aria-pressed={active}
                        className={`flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-amber-500 bg-amber-400 text-black shadow-sm font-semibold"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        <Icon className="size-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {isRoundTrip && (
                  <p className="text-xs text-amber-700">
                    Round trips cover the journey there and back with multiple stops support — minimum {MIN_TRIP_KM} km total.
                  </p>
                )}
              </div>

              {/* Date and Time for Booking */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-950">Pickup Schedule</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pickupDate" className="text-xs font-semibold">
                      Pickup Date *
                    </Label>
                    <div className="relative">
                      <Input
                        id="pickupDate"
                        type="date"
                        min={todayStr}
                        className="bg-white font-medium"
                        aria-invalid={!!errors.pickupDate}
                        {...register("pickupDate")}
                      />
                    </div>
                    {errors.pickupDate && (
                      <p className="text-xs text-destructive">{errors.pickupDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupTime" className="text-xs font-semibold">
                      Pickup Time *
                    </Label>
                    <div className="relative">
                      <Input
                        id="pickupTime"
                        type="time"
                        className="bg-white font-medium"
                        aria-invalid={!!errors.pickupTime}
                        {...register("pickupTime")}
                      />
                    </div>
                    {errors.pickupTime && (
                      <p className="text-xs text-destructive">{errors.pickupTime.message}</p>
                    )}
                  </div>
                </div>

                {/* Optional return schedule for round trips */}
                {isRoundTrip && (
                  <div className="border-t border-amber-200 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                        <ArrowLeftRight className="size-3.5 text-amber-700" />
                        Return Journey Schedule <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="returnDate" className="text-xs text-muted-foreground">
                          Return Date
                        </Label>
                        <Input
                          id="returnDate"
                          type="date"
                          min={pickupDateValue || todayStr}
                          className="bg-white text-xs"
                          {...register("returnDate")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="returnTime" className="text-xs text-muted-foreground">
                          Return Time
                        </Label>
                        <Input
                          id="returnTime"
                          type="time"
                          className="bg-white text-xs"
                          {...register("returnTime")}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Route: Pickup & Drop(s) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation">Pickup location *</Label>
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      id="pickupLocation"
                      placeholder="e.g. Indiranagar Metro Station, Trichy"
                      className="pl-9"
                      aria-invalid={!!errors.pickupLocation}
                      {...register("pickupLocation")}
                    />
                  </div>
                  {errors.pickupLocation && (
                    <p className="text-xs text-destructive">{errors.pickupLocation.message}</p>
                  )}
                </div>

                {/* Single drop for One Way or Multiple drops for Round Trip */}
                {isRoundTrip ? (
                  <div className="space-y-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/30 p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <Navigation className="size-4 text-rose-600" />
                        Round Trip Drop Locations &amp; Stops *
                      </Label>
                      <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                        Multiple stops supported
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add all the destinations and intermediate drop points for your round trip journey.
                    </p>

                    <div className="space-y-2.5">
                      {roundTripDrops.map((drop, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1.5">
                              <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[11px] font-bold text-amber-900 whitespace-nowrap">
                                Stop {idx + 1}
                              </span>
                            </div>
                            <Input
                              value={drop}
                              onChange={(e) => updateRoundTripDrop(idx, e.target.value)}
                              placeholder={
                                idx === 0
                                  ? "e.g. Madurai Meenakshi Amman Temple"
                                  : idx === 1
                                  ? "e.g. Kodaikanal Lake"
                                  : `e.g. Stop ${idx + 1} location`
                              }
                              className="pl-20 bg-white"
                            />
                          </div>
                          {roundTripDrops.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeRoundTripDrop(idx)}
                              className="size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              title="Remove this stop"
                              aria-label={`Remove stop ${idx + 1}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {roundTripDropError && (
                      <p className="text-xs text-destructive font-medium">{roundTripDropError}</p>
                    )}

                    {roundTripDrops.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRoundTripDrop}
                        className="mt-1 cursor-pointer gap-1.5 border-dashed border-amber-400 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        <Plus className="size-3.5" />
                        Add another drop / stop ({roundTripDrops.length}/6)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="dropLocation">Drop location *</Label>
                    <div className="relative">
                      <Navigation className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-rose-600" />
                      <Input
                        id="dropLocation"
                        placeholder="e.g. Kempegowda Airport T2"
                        className="pl-9"
                        aria-invalid={!!errors.dropLocation}
                        {...register("dropLocation")}
                      />
                    </div>
                    {errors.dropLocation && (
                      <p className="text-xs text-destructive">{errors.dropLocation.message}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Passengers</Label>
                  <Select
                    value={watch("passengers")}
                    onValueChange={(v) => setValue("passengers", v)}
                  >
                    <SelectTrigger className="w-full" aria-label="Number of passengers">
                      <Users className="mr-2 size-4 text-muted-foreground" />
                      <SelectValue placeholder="Select passengers" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5", "6"].map((n) => (
                        <SelectItem key={n} value={n}>
                          {n} passenger{n === "1" ? "" : "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Distance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="distance" className="flex items-center gap-1.5">
                  <Route className="size-4 text-muted-foreground" />
                  {isRoundTrip ? "Estimated total journey distance" : "Trip distance"}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="distance"
                    type="number"
                    min={distanceMin}
                    max={distanceMax}
                    step={1}
                    value={Math.round(distanceKm * 1000) / 1000}
                    onChange={(e) => onDistanceInput(e.target.value)}
                    className="h-8 w-20 text-right"
                    aria-label="Trip distance in kilometers"
                  />
                  <span className="text-sm text-muted-foreground">km</span>
                </div>
              </div>
              <Slider
                value={[Math.min(distanceMax, Math.max(distanceMin, distanceKm))]}
                onChange={(v) => Array.isArray(v) && onSliderChange(v as unknown as number[])}
                onValueChange={onSliderChange}
                min={distanceMin}
                max={2000}
                step={5}
                aria-label="Trip distance slider"
              />
              <p className="text-xs text-muted-foreground">
                {`Minimum ${MIN_TRIP_KM} km${isRoundTrip ? " total for round trip" : ""} — adjust the slider or type your route distance.`}
              </p>
            </div>

            <Separator />

            {/* Cab type selection */}
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Choose your ride
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {CAB_TYPES.map((cab) => {
                  const active = cab.id === cabType;
                  return (
                    <button
                      key={cab.id}
                      type="button"
                      onClick={() => setCabType(cab.id)}
                      aria-pressed={active}
                      className={`relative flex min-w-0 items-center gap-3 rounded-xl border p-4 text-left transition-all min-h-[76px] cursor-pointer ${
                        active
                          ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/40 dark:bg-amber-950/30"
                          : "hover:border-amber-300 hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-3xl" aria-hidden>
                        {cab.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          {cab.name}
                          <span className="text-xs font-normal text-muted-foreground">
                            · {cab.seats} seats
                          </span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {cab.description}
                        </span>
                      </span>
                      {active && (
                        <CheckCircle2 className="absolute -top-2 -right-2 size-5 fill-amber-400 text-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="h-12 w-full cursor-pointer bg-amber-400 text-base font-bold text-black hover:bg-amber-500 shadow-md transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Confirming your booking…
                </>
              ) : (
                <>Confirm booking</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ---------------- Confirmation dialog ---------------- */}
      <Dialog
        open={!!confirmedBooking}
        onOpenChange={(open) => !open && setConfirmedBooking(null)}
      >
        <DialogContent className="sm:max-w-md">
          {confirmedBooking && (
            <>
              <DialogHeader>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100"
                >
                  <BadgeCheck className="size-9 text-emerald-600" />
                </motion.div>
                <DialogTitle className="text-center text-2xl">
                  Ride confirmed!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Your {confirmedBooking.tripType === "ROUND_TRIP" ? "round trip" : "ride"} is
                  booked and scheduled. Our driver will be ready at your pickup time.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Booking reference
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-amber-950">
                    {confirmedBooking.bookingRef}
                  </p>
                </div>
                <div className="space-y-2.5 rounded-xl bg-muted p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Passenger</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.passengerName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trip type</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.tripType === "ROUND_TRIP" ? "Round trip ↔" : "One way →"}
                    </span>
                  </div>
                  {confirmedBooking.pickupDate && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Pickup Schedule</span>
                      <span className="text-right font-semibold text-amber-800">
                        {confirmedBooking.pickupDate} at {confirmedBooking.pickupTime}
                      </span>
                    </div>
                  )}
                  {confirmedBooking.returnDate && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Return Schedule</span>
                      <span className="text-right font-semibold text-amber-800">
                        {confirmedBooking.returnDate} at {confirmedBooking.returnTime}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Pickup</span>
                    <span className="max-w-[60%] truncate text-right font-medium">
                      {confirmedBooking.pickupLocation}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      {confirmedBooking.dropLocations ? "Drop(s)" : "Drop"}
                    </span>
                    <span className="max-w-[60%] text-right font-medium text-rose-700">
                      {confirmedBooking.dropLocation}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.distanceKm} km
                    </span>
                  </div>
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Toll, Permit &amp; Parking charges are separate.
                  </p>
                </div>
                <Button
                  className="w-full cursor-pointer bg-amber-400 font-bold text-black hover:bg-amber-500"
                  onClick={() => setConfirmedBooking(null)}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
