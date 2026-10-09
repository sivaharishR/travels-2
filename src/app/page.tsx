"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  CarTaxiFront,
  ShieldCheck,
  Clock3,
  ArrowLeftRight,
  Star,
  MapPinned,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingSection } from "@/components/booking/booking-form";
import { RecentBookings } from "@/components/booking/recent-bookings";
import { AdminLoginDialog } from "@/components/booking/admin-login-dialog";
import { AdminDashboard } from "@/components/booking/admin-dashboard";
import { useAdminSession, setAdminToken } from "@/lib/admin-session";

const STATS = [
  { icon: CarTaxiFront, label: "50k+ rides completed" },
  { icon: Star, label: "4.8/5 driver rating" },
  { icon: Timer, label: "~4 min avg. pickup" },
];

const FEATURES = [
  {
    icon: MapPinned,
    title: "Easy booking",
    description:
      "Enter pickup and drop, pick your cab and confirm — takes less than a minute.",
  },
  {
    icon: ArrowLeftRight,
    title: "One way or round trip",
    description:
      "City rides when you need them, outstation round trips from 350 km. Your call.",
  },
  {
    icon: Clock3,
    title: "Flexible scheduling",
    description:
      "No time slots to fill — book now and we'll call you to plan the departure.",
  },
  {
    icon: ShieldCheck,
    title: "Verified drivers",
    description:
      "Background-verified drivers, live trip tracking and 24×7 support on every ride.",
  },
];

export default function Home() {
  const [bookingsVersion, setBookingsVersion] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const adminToken = useAdminSession();

  const handleAdminLogin = useCallback((token: string) => {
    setAdminToken(token);
    setLoginOpen(false);
  }, []);

  const handleAdminLogout = useCallback(() => {
    setAdminToken(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 via-white to-white">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <CarTaxiFront className="size-6 text-black" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight">QuickCab</span>
              <span className="text-xs text-muted-foreground">City taxi booking</span>
            </span>
          </a>
          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-4">
            {adminToken ? (
              <>
                <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <ShieldCheck className="size-3.5" />
                  Admin mode
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdminLogout}
                  className="cursor-pointer"
                >
                  Exit admin
                </Button>
              </>
            ) : (
              <>
                <a
                  href="#book"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:block"
                >
                  Book a ride
                </a>
                <a
                  href="#bookings"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:block"
                >
                  My bookings
                </a>
                <a
                  href="#book"
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-amber-500"
                >
                  Book now
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                  className="cursor-pointer gap-1.5"
                  aria-label="Admin sign in"
                >
                  <ShieldCheck className="size-4" />
                  Admin
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ---------- Main ---------- */}
      <main className="flex-1">
        {adminToken ? (
          <div className="pt-8">
            <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-14">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto max-w-2xl space-y-4"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3.5 py-1 text-xs font-semibold text-amber-900">
                  <Clock3 className="size-3.5" />
                  Available 24×7 across the city
                </span>
                <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
                  Your ride, ready{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">when you are</span>
                    <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-amber-300/70" />
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  One way or round trip — book in under a minute, no calls, no
                  haggling.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
              >
                {STATS.map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5">
                    <s.icon className="size-4 text-amber-600" />
                    {s.label}
                  </span>
                ))}
              </motion.div>
            </section>

            {/* Booking form */}
            <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
              <BookingSection onBooked={() => setBookingsVersion((v) => v + 1)} />
            </section>

            {/* Recent bookings */}
            <section id="bookings" className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
              <RecentBookings version={bookingsVersion} />
            </section>

            {/* Features */}
            <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="rounded-xl border bg-card p-5 shadow-sm"
                  >
                    <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-amber-100">
                      <f.icon className="size-5 text-amber-700" />
                    </span>
                    <h3 className="mb-1 font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ---------- Footer (sticks to bottom) ---------- */}
      <footer className="mt-auto border-t bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p
            className="flex items-center gap-1.5"
            suppressHydrationWarning
          >
            <CarTaxiFront className="size-4 text-amber-600" />
            © {new Date().getFullYear()} QuickCab — fast, fair city rides.
          </p>
          <p>
            Support: <span className="font-medium text-foreground">1800-QUICK-CAB</span>
          </p>
        </div>
      </footer>

      {/* ---------- Admin login dialog ---------- */}
      <AdminLoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={handleAdminLogin}
      />
    </div>
  );
}
