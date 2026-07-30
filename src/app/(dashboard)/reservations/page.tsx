import { CalendarDays } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { ReservationsBoard } from "@/components/reservations-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function ReservationsPage() {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);

  const [reservations, tables] = await Promise.all([
    prisma.reservation.findMany({
      where: { outletId },
      orderBy: { reservedAt: "asc" },
      include: { table: { select: { name: true } } },
    }),
    prisma.diningTable.findMany({
      where: { outletId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const booked = reservations.filter((r) => r.status === "BOOKED").length;

  return (
    <ModulePage title="Reservations" subtitle="Table booking & waitlist" icon={CalendarDays}>
      <StatRow
        stats={[
          { label: "Total", value: String(reservations.length) },
          { label: "Booked", value: String(booked) },
          { label: "Tables", value: String(tables.length) },
          { label: "Synced", value: "Live" },
        ]}
      />
      <ReservationsBoard
        tables={tables}
        reservations={reservations.map((r) => ({
          id: r.id,
          guestName: r.guestName,
          phone: r.phone,
          partySize: r.partySize,
          reservedAt: r.reservedAt.toISOString(),
          status: r.status,
          notes: r.notes,
          tableName: r.table?.name ?? null,
        }))}
      />
    </ModulePage>
  );
}
