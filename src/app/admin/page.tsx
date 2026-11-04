import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminHome } from "@/components/admin/AdminHome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel del profesor · Mates 1.º ESO", robots: { index: false } };

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminHome />
    </AdminGate>
  );
}
