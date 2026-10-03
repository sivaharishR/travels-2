"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Navigation,
  CalendarClock,
  Users,
  Clock,
  Route,
  CheckCircle2,
  Loader2,
  Info,
  CarTaxiFront,
  BadgeCheck,
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
import { CAB_TYPES, calculateFare, FREE_WAITING_MINUTES, WAITING_CHARGE_PER_MIN } from "@/lib/fare";
import type { Booking, FareEstimate } from "@/types/booking";

const WAITING_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

const formSchema = z.object({
  passengerName: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,15}$/, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  pickupLocation: z.string().trim().min(3, "Enter a pickup location"),
  dropLocation: z.string().trim().min(3, "Enter a drop location"),
  pickupTime: z.string().min(1, "Select a pickup date & time"),
  passengers: z.string().min(1, "Select passengers"),
});

type FormValues = z.infer<typeof formSchema>;

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Deterministic pseudo distance estimate derived from the two location names.
function estimateDistanceKm(a: string, b: string): number {
  const s = `${a.trim().toLowerCase()}->${b.trim().toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return Math.round((2 + (h % 4300) / 100) * 10) / 10; // 2.0 - 44.9 km
}

const clientFallbackEstimates = (
  distanceKm: number,
  waitingMinutes: number
): FareEstimate[] =>
  CAB_TYPES.map((cab) => ({
    cabTypeId: cab.id,
    name: cab.name,
    icon: cab.icon,
    seats: cab.seats,
    description: cab.description,
    ...calculateFare(cab.id, distanceKm, waitingMinutes),
  }));

export function BookingSection({ onBooked }: { onBooked?: () => void }) {
  const { toast } = useToast();
  const [cabType, setCabType] = useState<string>("hatchback");
  const [distanceKm, setDistanceKm] = useState<number>(8);
  const [waitingMinutes, setWaitingMinutes] = useState<number>(0);
  const [distanceTouched, setDistanceTouched] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [estimates, setEstimates] = useState<FareEstimate[]>(() =>
    clientFallbackEstimates(8, 0)
  );
  const [estimating, setEstimating] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const distanceTouchedRef = useRef<boolean>(false);

  const {
    register,
    handleSubmit,
    getValues,
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
      pickupTime: "",
      passengers: "1",
    },
  });

  // Default pickup time: 30 minutes from now (client-only to avoid hydration mismatch)
  useEffect(() => {
    if (!getValues("pickupTime")) {
      setValue("pickupTime", toDatetimeLocal(new Date(Date.now() + 30 * 60 * 1000)));
    }
  }, [getValues, setValue]);

  // `min` for the pickup time input. Computed AFTER hydration only — computing
  // it during render embeds the server's clock into SSR HTML, causing a
  // hydration mismatch (server time vs. visitor's local time).
  const [pickupTimeMin, setPickupTimeMin] = useState<string>("");
  useEffect(() => {
    setPickupTimeMin(toDatetimeLocal(new Date()));
  }, []);

  // Live fare estimates via API (debounced), with client-side fallback
  useEffect(() => {
    setEstimating(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ distanceKm, waitingMinutes }),
        });
        const data = await res.json();
        if (!res.ok || !data.estimates) throw new Error("estimate failed");
        setEstimates(data.estimates);
      } catch {
        setEstimates(clientFallbackEstimates(distanceKm, waitingMinutes));
      } finally {
        setEstimating(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [distanceKm, waitingMinutes]);

  const selectedEstimate =
    estimates.find((e) => e.cabTypeId === cabType) ?? estimates[0];
  const selectedCab = CAB_TYPES.find((c) => c.id === cabType) ?? CAB_TYPES[0];

  const pickup = watch("pickupLocation");
  const drop = watch("dropLocation");

  const handleLocationBlur = () => {
    if (distanceTouchedRef.current) return;
    const p = getValues("pickupLocation");
    const d = getValues("dropLocation");
    if (p.trim().length >= 3 && d.trim().length >= 3) {
      setDistanceKm(estimateDistanceKm(p, d));
    }
  };

  const onSliderChange = (vals: number[]) => {
    distanceTouchedRef.current = true;
    setDistanceTouched(true);
    // Round to kill Radix slider float-normalization noise (e.g. 40.29999923706055)
    setDistanceKm(Math.round(vals[0] * 1000) / 1000);
  };

  const onDistanceInput = (raw: string) => {
    const n = Number(raw);
    if (isNaN(n)) return;
    distanceTouchedRef.current = true;
    setDistanceTouched(true);
    setDistanceKm(Math.round(Math.max(1, Math.min(500, n)) * 1000) / 1000);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || null,
          cabType,
          passengers: Number(values.passengers),
          distanceKm,
          waitingMinutes,
          pickupTime: new Date(values.pickupTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not confirm your booking");
      }
      setConfirmedBooking(data.booking as Booking);
      onBooked?.();
      toast({
        title: "Ride confirmed 🚕",
        description: `Booking ${data.booking.bookingRef} is confirmed. Your cab is on its way!`,
      });
      reset({
        passengerName: "",
        phone: "",
        email: "",
        pickupLocation: "",
        dropLocation: "",
        pickupTime: toDatetimeLocal(new Date(Date.now() + 30 * 60 * 1000)),
        passengers: "1",
      });
      distanceTouchedRef.current = false;
      setDistanceTouched(false);
      setDistanceKm(8);
      setWaitingMinutes(0);
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
    <section id="book" className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ---------------- Left: booking form ---------------- */}
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
                      {...register("pickupLocation", { onBlur: handleLocationBlur })}
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
                      {...register("dropLocation", { onBlur: handleLocationBlur })}
                    />
                  </div>
                  {errors.dropLocation && (
                    <p className="text-xs text-destructive">{errors.dropLocation.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupTime">Pickup date &amp; time *</Label>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pickupTime"
                      type="datetime-local"
                      min={pickupTimeMin}
                      className="pl-9"
                      aria-invalid={!!errors.pickupTime}
                      {...register("pickupTime")}
                    />
                  </div>
                  {errors.pickupTime && (
                    <p className="text-xs text-destructive">{errors.pickupTime.message}</p>
                  )}
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

            {/* Distance + waiting time */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="distance" className="flex items-center gap-1.5">
                    <Route className="size-4 text-muted-foreground" />
                    Trip distance
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="distance"
                      type="number"
                      min={1}
                      max={500}
                      step={0.5}
                      value={Math.round(distanceKm * 1000) / 1000}
                      onChange={(e) => onDistanceInput(e.target.value)}
                      className="h-8 w-20 text-right"
                      aria-label="Trip distance in kilometers"
                    />
                    <span className="text-sm text-muted-foreground">km</span>
                  </div>
                </div>
                <Slider
                  value={[Math.min(100, Math.max(1, distanceKm))]}
                  onValueChange={onSliderChange}
                  min={1}
                  max={100}
                  step={1}
                  aria-label="Trip distance slider"
                />
                <p className="text-xs text-muted-foreground">
                  {distanceTouched
                    ? "Custom distance — drag the slider to adjust."
                    : "Auto-estimated from your locations — adjust if needed."}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Clock className="size-4 text-muted-foreground" />
                  Waiting time at pickup
                </Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Waiting time in minutes">
                  {WAITING_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWaitingMinutes(m)}
                      aria-pressed={waitingMinutes === m}
                      className={`min-h-9 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        waitingMinutes === m
                          ? "border-amber-500 bg-amber-400 text-black shadow-sm"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {m === 0 ? "No wait" : `${m} min`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  First {FREE_WAITING_MINUTES} minutes are free, then ₹
                  {WAITING_CHARGE_PER_MIN}/min applies.
                </p>
              </div>
            </div>

            <Separator />

            {/* Cab type selection */}
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Choose your ride
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {estimates.map((est) => {
                  const active = est.cabTypeId === cabType;
                  return (
                    <button
                      key={est.cabTypeId}
                      type="button"
                      onClick={() => setCabType(est.cabTypeId)}
                      aria-pressed={active}
                      className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all min-h-[76px] ${
                        active
                          ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/40 dark:bg-amber-950/30"
                          : "hover:border-amber-300 hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-3xl" aria-hidden>
                        {est.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          {est.name}
                          <span className="text-xs font-normal text-muted-foreground">
                            · {est.seats} seats
                          </span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {est.description}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-lg font-bold">
                          {estimating ? (
                            <span className="inline-block h-5 w-14 animate-pulse rounded bg-muted" />
                          ) : (
                            formatINR(est.totalFare)
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          ₹{est.perKmRate}/km
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

            {/* Submit (mobile / in-form) */}
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="h-12 w-full cursor-pointer bg-amber-400 text-base font-bold text-black hover:bg-amber-500 lg:hidden"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Confirming…
                </>
              ) : (
                <>Confirm booking · {selectedEstimate ? formatINR(selectedEstimate.totalFare) : "—"}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ---------------- Right: fare summary (desktop) ---------------- */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden py-0">
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 text-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Fare summary</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs font-semibold">
                <CarTaxiFront className="size-4" />
                {selectedCab.name}
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">{pickup || "Pickup location"}</span>
              </p>
              <p className="flex items-center gap-2 font-medium">
                <Navigation className="size-4 shrink-0" />
                <span className="truncate">{drop || "Drop location"}</span>
              </p>
            </div>
          </div>
          <CardContent className="space-y-4 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${cabType}-${distanceKm}-${waitingMinutes}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base fare</span>
                  <span className="font-medium">
                    {formatINR(selectedEstimate?.baseFare ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Distance · {distanceKm} km × {formatINR(selectedEstimate?.perKmRate ?? 0)}
                  </span>
                  <span className="font-medium">
                    {formatINR(selectedEstimate?.distanceFare ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Waiting · {waitingMinutes} min
                    {selectedEstimate && selectedEstimate.billableWaitingMinutes > 0
                      ? ` (${selectedEstimate.billableWaitingMinutes} billable)`
                      : " (free)"}
                  </span>
                  <span className="font-medium">
                    {selectedEstimate && selectedEstimate.waitingCharge > 0
                      ? formatINR(selectedEstimate.waitingCharge)
                      : "₹0"}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            <Separator />

            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold">Total payable</span>
              <motion.span
                key={`total-${cabType}-${distanceKm}-${waitingMinutes}`}
                initial={{ scale: 0.95, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-3xl font-extrabold tracking-tight"
              >
                {estimating && !selectedEstimate
                  ? "…"
                  : formatINR(selectedEstimate?.totalFare ?? 0)}
              </motion.span>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Fares are all-inclusive. First {FREE_WAITING_MINUTES} minutes of waiting
                are free, then ₹{WAITING_CHARGE_PER_MIN}/min. Pay cash or UPI after
                your ride.
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={submitting}
              onClick={handleSubmit(onSubmit)}
              className="h-12 w-full cursor-pointer bg-amber-400 text-base font-bold text-black hover:bg-amber-500 max-lg:hidden"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Confirming…
                </>
              ) : (
                <>Confirm booking</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

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
                  Your cab is booked. Show this reference to your driver.
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
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Pickup time</span>
                    <span className="text-right font-medium">
                      {format(
                        new Date(confirmedBooking.pickupTime),
                        "EEE, d MMM · h:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Waiting time</span>
                    <span className="text-right font-medium">
                      {confirmedBooking.waitingMinutes} min
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold">Total fare</span>
                    <span className="font-bold">
                      {formatINR(confirmedBooking.totalFare)}
                    </span>
                  </div>
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
