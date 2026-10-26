import Header from "@/components/Header";

// Shown instantly while the search runs, so the page never looks frozen.
export default function Loading() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Inventory</h1>
        <p className="mt-4 text-sm text-slate-500 font-semibold">Searching...</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-slate-100" />
          ))}
        </div>
      </main>
    </>
  );
}
