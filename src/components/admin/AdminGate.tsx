import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/session";
import { AdminLogin } from "./AdminLogin";

export async function AdminGate({ children }: { children: ReactNode }) {
  return (await requireAdmin()) ? children : <AdminLogin />;
}
