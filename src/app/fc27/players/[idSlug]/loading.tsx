export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-40 sm:px-6 sm:pt-48 animate-pulse">
      <div className="h-3 w-32 rounded bg-lime/20" />
      <div className="mt-8 grid gap-10 md:grid-cols-[300px_1fr]">
        <div className="mx-auto aspect-[3/4.3] w-full max-w-[300px] rounded-[22px] border border-white/8 bg-white/[.025]" />
        <div className="space-y-4">
          <div className="h-10 w-64 max-w-full rounded bg-white/10" />
          <div className="h-4 w-40 rounded bg-white/5" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => <div key={i} className="h-14 rounded-xl border border-white/8 bg-white/[.02]" />)}
          </div>
        </div>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-64 rounded-2xl border border-white/8 bg-white/[.025]" />)}
      </div>
    </div>
  );
}
