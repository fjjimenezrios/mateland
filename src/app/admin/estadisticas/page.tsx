import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { StatsPage } from "@/components/admin/StatsPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estadísticas · Mates 1.º ESO", robots: { index: false } };

export default function StatsRoute() {
  return (
    <AdminGate>
      <StatsPage />
    </AdminGate>
  );
}
