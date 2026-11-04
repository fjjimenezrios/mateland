"use client";

import { AccountTab } from "./AccountTab";
import { AdminShell } from "./AdminShell";

export function AccountPage() {
  return (
    <AdminShell crumbs={[{ label: "Panel", href: "/admin" }, { label: "Mi cuenta" }]}>
      <AccountTab />
    </AdminShell>
  );
}
