"use client";

import { AdminShell } from "./AdminShell";
import { StudentsTab } from "./StudentsTab";

export function StudentsPage() {
  return (
    <AdminShell crumbs={[{ label: "Panel", href: "/admin" }, { label: "Alumnos y clases" }]}>
      <StudentsTab />
    </AdminShell>
  );
}
