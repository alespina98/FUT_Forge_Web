export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-40 sm:px-6 sm:pt-48 animate-pulse">
      <div className="mx-auto h-3 w-32 rounded bg-lime/20" />
      <div className="mx-auto mt-6 h-14 w-80 max-w-full rounded bg-white/10" />
      <div className="mx-auto mt-5 h-5 w-full max-w-xl rounded bg-white/5" />
      <div className="mt-12 h-14 rounded-2xl border border-white/8 bg-white/[.02]" />
      <div className="fc27-grid mt-6">
        {Array.from({ length: 12 }, (_, i) => <div key={i} className="fc27-skeleton-card" />)}
      </div>
    </div>
  );
}
