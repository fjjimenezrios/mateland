import type { Metadata } from "next";
import { AccountPage } from "@/components/admin/AccountPage";
import { AdminGate } from "@/components/admin/AdminGate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta · Mates 1.º ESO", robots: { index: false } };

export default function AccountRoute() {
  return (
    <AdminGate>
      <AccountPage />
    </AdminGate>
  );
}
