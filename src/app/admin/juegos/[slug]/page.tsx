import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminGate } from "@/components/admin/AdminGate";
import { GameAdminPage } from "@/components/admin/GameAdminPage";
import { getGame } from "@/games/registry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ajustes del juego · Mates 1.º ESO", robots: { index: false } };

export default async function GameAdminRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getGame(slug)) notFound();
  return (
    <AdminGate>
      <GameAdminPage slug={slug} />
    </AdminGate>
  );
}
