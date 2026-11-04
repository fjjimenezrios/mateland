import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { StudentsPage } from "@/components/admin/StudentsPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alumnos · Mates 1.º ESO", robots: { index: false } };

export default function StudentsRoute() {
  return (
    <AdminGate>
      <StudentsPage />
    </AdminGate>
  );
}
