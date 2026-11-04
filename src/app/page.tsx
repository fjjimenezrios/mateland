import { redirect } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { games } from "@/games/registry";
import { readGameStates } from "@/lib/games-store";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const [states, { todos }] = await Promise.all([readGameStates(), searchParams]);
  const enabled = games.filter((game) => states[game.slug].enabled);
  if (enabled.length === 1 && !todos) redirect(`/juegos/${enabled[0].slug}`);
  const cards = enabled.map(({ slug, title, topic, tagline, theme }) => ({ slug, title, topic, tagline, theme }));
  return <Gallery games={cards} />;
}
