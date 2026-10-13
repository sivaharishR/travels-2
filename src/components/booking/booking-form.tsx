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
  PhoneCall,
  Info,
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

const formSchema = z.object({
  passengerName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,15}$/, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  pickupLocation: z.string().trim().min(3, "Enter a pickup location"),
  dropLocation: z.string().trim().min(3, "Enter a drop location"),
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
      passengers: "1",
      tripType: "ONE_WAY",
    },
  });

  const tripType = watch("tripType") as TripType;
  const isRoundTrip = tripType === "ROUND_TRIP";

  // Both one-way and round trips share the same distance bounds:
  // minimum 150 km, effectively no maximum (5000 km sanity cap server-side)
  const distanceMin = MIN_TRIP_KM;
  const distanceMax = MAX_TRIP_KM;

  const setTripType = (t: TripType) => {
    setValue("tripType", t, { shouldValidate: true });
    setDistanceKm((prev) => Math.max(distanceMin, Math.min(distanceMax, prev)));
  };

  const onSliderChange = (vals: number[]) => {
    // Round to kill Radix slider float-normalization noise (e.g. 40.29999923706055)
    setDistanceKm(Math.round(vals[0] * 1000) / 1000);
  };

  const onDistanceInput = (raw: string) => {
    const n = Number(raw);
    if (isNaN(n)) return;
    const clamped = Math.round(Math.max(distanceMin, Math.min(distanceMax, n)) * 1000) / 1000;
    setDistanceKm(clamped);
  };

  const onSubmit = async (values: FormValues) => {
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
          dropLocation: values.dropLocation,
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
        description: `Booking ${data.booking.bookingRef} is confirmed. We'll call you to plan the departure!`,
      });
      reset({
        passengerName: "",
        phone: "",
        email: "",
        pickupLocation: "",
        dropLocation: "",
        passengers: "1",
        tripType,
      });
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
      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle className="text-xl">Book your ride</CardTitle>
          <CardDescription>
            Fill in your details and trip information — takes less than a minute.
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
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Trip details
              </h3>

              {/* Trip type */}
              <div className="mb-5 space-y-2">
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
                            ? "border-amber-500 bg-amber-400 text-black shadow-sm"
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
                    Round trips cover the journey there and back — minimum {MIN_TRIP_KM} km total.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation">Pickup location *</Label>
                  <div className="relative">
                    <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      id="pickupLocation"
                      placeholder="e.g. Indiranagar Metro Station"
                      className="pl-9"
                      aria-invalid={!!errors.pickupLocation}
                      {...register("pickupLocation")}
                    />
                  </div>
                  {errors.pickupLocation && (
                    <p className="text-xs text-destructive">{errors.pickupLocation.message}</p>
                  )}
                </div>
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
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
                  <PhoneCall className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    No pickup time needed — after booking, our team will call you to arrange a
                    convenient departure.
                  </span>
                </div>
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
                  {isRoundTrip ? "Total distance" : "Trip distance"}
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
                onValueChange={onSliderChange}
                min={distanceMin}
                max={2000}
                step={5}
                aria-label="Trip distance slider"
              />
              <p className="text-xs text-muted-foreground">
                {`Minimum ${MIN_TRIP_KM} km${isRoundTrip ? " total" : ""} — drag the slider or type the distance.`}
              </p>
            </div>

            <Separator />

            {/* Cab type selection (no rates shown) */}
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
                      className={`relative flex min-w-0 items-center gap-3 rounded-xl border p-4 text-left transition-all min-h-[76px] ${
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
              className="h-12 w-full cursor-pointer bg-amber-400 text-base font-bold text-black hover:bg-amber-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Confirming…
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
                  booked. Our team will call you shortly to schedule the departure.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Booking reference
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-widest">
                    {confirmedBooking.bookingRef}
                  </p>
                </div>
                <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Passenger</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.passengerName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Trip type</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.tripType === "ROUND_TRIP" ? "Round trip" : "One way"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Pickup</span>
                    <span className="max-w-[60%] truncate text-right font-medium">
                      {confirmedBooking.pickupLocation}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Drop</span>
                    <span className="max-w-[60%] truncate text-right font-medium">
                      {confirmedBooking.dropLocation}
                    </span>
                  </div>
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Toll, Permit &amp; Parking charges are separate. We&apos;ll discuss the fare on
                    call.
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
