"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CarTaxiFront,
  RefreshCw,
  LogOut,
  ShieldCheck,
  XCircle,
  BadgeCheck,
  IndianRupee,
  Activity,
  Table2,
  Inbox,
  ShieldAlert,
  LogIn,
  Clock,
  Mail,
  MailX,
  MailQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CAB_TYPES } from "@/lib/fare";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/booking/status-badge";
import type { AdminDashboardData } from "@/types/booking";

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const ACTIVITY_STYLES: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  BOOKING_CREATED: {
    icon: CarTaxiFront,
    className: "bg-emerald-100 text-emerald-700",
  },
  BOOKING_CANCELLED: {
    icon: XCircle,
    className: "bg-rose-100 text-rose-700",
  },
  BOOKING_UPDATED: {
    icon: Activity,
    className: "bg-amber-100 text-amber-700",
  },
  ADMIN_LOGIN: {
    icon: LogIn,
    className: "bg-teal-100 text-teal-700",
  },
  ADMIN_LOGIN_FAILED: {
    icon: ShieldAlert,
    className: "bg-rose-100 text-rose-700",
  },
  ADMIN_LOGOUT: {
    icon: LogOut,
    className: "bg-zinc-100 text-zinc-600",
  },
  EMAIL_SENT: {
    icon: Mail,
    className: "bg-teal-100 text-teal-700",
  },
  EMAIL_SKIPPED: {
    icon: MailQuestion,
    className: "bg-amber-100 text-amber-700",
  },
  EMAIL_FAILED: {
    icon: MailX,
    className: "bg-rose-100 text-rose-700",
  },
};

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const { toast } = useToast();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        // Session expired/invalidated — bounce back to customer view
        toast({
          title: "Session expired",
          description: "Please sign in again.",
        });
        onLogout();
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json as AdminDashboardData);
    } catch (err) {
      toast({
        title: "Could not load dashboard",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, onLogout, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore network errors on logout
    } finally {
      setLoggingOut(false);
      onLogout();
    }
  };

  const stats = data?.stats;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <Card className="py-6">
        <CardContent className="space-y-6 px-6">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100">
                <ShieldCheck className="size-5 text-amber-700" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Admin dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  All bookings and platform activity, updated live.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="cursor-pointer gap-1.5"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="cursor-pointer gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </div>

          {/* Stats */}
          {loading && !stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={CarTaxiFront}
                label="Total bookings"
                value={String(stats.total)}
                sub={`${stats.roundTrips} round trip${stats.roundTrips === 1 ? "" : "s"}`}
              />
              <StatCard
                icon={BadgeCheck}
                label="Active (confirmed)"
                value={String(stats.confirmed)}
                sub={`${stats.completed} completed`}
              />
              <StatCard
                icon={XCircle}
                label="Cancelled"
                value={String(stats.cancelled)}
                sub={
                  stats.total > 0
                    ? `${Math.round((stats.cancelled / stats.total) * 100)}% of all bookings`
                    : "—"
                }
              />
              <StatCard
                icon={IndianRupee}
                label="Revenue (excl. cancelled)"
                value={formatINR(stats.revenue)}
                sub="All-inclusive fares"
                highlight
              />
            </div>
          ) : null}

          {/* Tabs: bookings table + activity feed */}
          <Tabs defaultValue="bookings">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="bookings" className="gap-1.5 cursor-pointer">
                <Table2 className="size-4" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 cursor-pointer">
                <Activity className="size-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-1.5 cursor-pointer">
                <Mail className="size-4" />
                Emails
              </TabsTrigger>
            </TabsList>

            {/* Bookings table */}
            <TabsContent value="bookings" className="mt-4">
              {loading && !data ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : !data || data.bookings.length === 0 ? (
                <EmptyState text="No bookings yet. Activity will appear here as customers book rides." />
              ) : (
                <div className="custom-scrollbar max-h-[520px] overflow-auto rounded-xl border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Cab</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                        <TableHead className="text-right">Fare</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Booked at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.bookings.map((b) => {
                        const cab = CAB_TYPES.find((c) => c.id === b.cabType);
                        return (
                          <TableRow
                            key={b.id}
                            className={b.status === "CANCELLED" ? "opacity-60" : ""}
                          >
                            <TableCell className="font-mono text-xs font-bold tracking-wide whitespace-nowrap">
                              {b.bookingRef}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap">
                                {b.passengerName}
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {b.phone}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[260px]">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span className="truncate">{b.pickupLocation}</span>
                              </div>
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
                                <span className="truncate">{b.dropLocation}</span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {cab?.icon} {cab?.name ?? b.cabType}
                              <span className="block text-xs text-muted-foreground">
                                {b.passengers} pax
                                {b.tripType === "ROUND_TRIP" && (
                                  <span className="font-medium text-amber-700"> · ↔ Round trip</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {b.distanceKm} km
                            </TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {formatINR(b.totalFare)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={b.status} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(b.createdAt), "d MMM, HH:mm")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Activity feed */}
            <TabsContent value="activity" className="mt-4">
              {loading && !data ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : !data || data.activities.length === 0 ? (
                <EmptyState text="No activity yet. Booking and admin events will appear here." />
              ) : (
                <ul className="custom-scrollbar max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                  {data.activities.map((a) => {
                    const style =
                      ACTIVITY_STYLES[a.type] ?? ACTIVITY_STYLES.BOOKING_UPDATED;
                    const Icon = style.icon;
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                      >
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${style.className}`}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{a.message}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {format(new Date(a.createdAt), "EEE, d MMM · HH:mm:ss")}
                            {a.bookingRef && (
                              <span className="font-mono font-semibold text-amber-700">
                                {a.bookingRef}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* Email notifications log */}
            <TabsContent value="emails" className="mt-4">
              {loading && !data ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : !data || data.emailLogs.length === 0 ? (
                <EmptyState text="No email notifications yet. Every new booking triggers one to the admin." />
              ) : (
                <ul className="custom-scrollbar max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                  {data.emailLogs.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          e.status === "SENT"
                            ? "bg-teal-100 text-teal-700"
                            : e.status === "SKIPPED"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {e.status === "SENT" ? (
                          <Mail className="size-4" />
                        ) : e.status === "SKIPPED" ? (
                          <MailQuestion className="size-4" />
                        ) : (
                          <MailX className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.subject}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>To: {e.toAddress}</span>
                          {e.bookingRef && (
                            <span className="font-mono font-semibold text-amber-700">
                              {e.bookingRef}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(new Date(e.createdAt), "EEE, d MMM · HH:mm:ss")}
                          </span>
                        </p>
                        {e.error && (
                          <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            {e.error}
                          </p>
                        )}
                      </div>
                      <EmailStatusBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  if (status === "SENT") {
    return (
      <Badge className="shrink-0 border-transparent bg-teal-100 text-teal-800 hover:bg-teal-100">
        Sent
      </Badge>
    );
  }
  if (status === "SKIPPED") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 border-amber-300 bg-amber-50 text-amber-800"
      >
        Not sent — SMTP off
      </Badge>
    );
  }
  return (
    <Badge className="shrink-0 border-transparent bg-rose-100 text-rose-800 hover:bg-rose-100">
      Failed
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-amber-300 bg-amber-50" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-amber-600" />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
