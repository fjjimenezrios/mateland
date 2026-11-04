import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6" style={{ background: "radial-gradient(120% 90% at 20% 0%, #5b2a9d, #150a30)" }}>
      <div className="sheet max-w-md p-8 text-center">
        <p className="text-6xl" aria-hidden>🍊</p>
        <h1 className="mt-2 text-3xl font-extrabold">Esta página se ha perdido</h1>
        <p className="mt-2 font-semibold">No hemos encontrado lo que buscas.</p>
        <Link href="/?todos=1" className="btn btn-orange mt-5">
          Volver a los juegos
        </Link>
      </div>
    </main>
  );
}
