import { notFound } from "next/navigation";
import { GameRunner } from "@/components/GameRunner";
import { getGame } from "@/games/registry";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getGame(slug)) notFound();
  return <GameRunner slug={slug} />;
}
