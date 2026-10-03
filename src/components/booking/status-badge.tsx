import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
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
