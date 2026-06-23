export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <p className="text-sm uppercase tracking-widest text-slate-400">
          Commercial Scheduler Command Center
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          energy-Logix
        </h1>
        <p className="text-slate-400 text-lg">
          Multi-Asset Diluent Blender &amp; Pipeline Disruption Simulator
        </p>
        <div className="flex gap-3 justify-center text-sm">
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Optimal
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Restricted
          </span>
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            Disrupted
          </span>
        </div>
        <p className="text-slate-500 text-sm">
          Dashboard UI — Step 3. API &amp; database scaffold ready.
        </p>
      </div>
    </main>
  );
}
