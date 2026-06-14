export default function LocaleLoading() {
  return (
    <main
      className="velmere-public-page min-h-[100dvh] bg-velmere-black px-5 pb-24 pt-28 text-white md:px-10 md:pt-36"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Velmère"
      data-pass2007-route-loading="stable-solid-low-motion"
    >
      <section className="mx-auto max-w-7xl">
        <span className="sr-only">Loading Velmère</span>
        <div className="velmere-loading-shell pass2007-loading-shell rounded-[1.5rem] border border-white/[0.08] bg-[#090b0e] p-6 md:p-10">
          <div className="velmere-skeleton h-3 w-28 rounded-full" />
          <div className="velmere-skeleton mt-7 h-14 max-w-2xl rounded-2xl md:h-20" />
          <div className="velmere-skeleton mt-4 h-4 max-w-xl rounded-full" />
          <div className="velmere-skeleton mt-2 h-4 max-w-md rounded-full" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="pass2007-loading-column border-l border-white/[0.07] p-5 first:border-l-0">
                <div className="velmere-skeleton h-10 w-10 rounded-full" />
                <div className="velmere-skeleton mt-6 h-4 w-2/3 rounded-full" />
                <div className="velmere-skeleton mt-3 h-3 w-full rounded-full" />
                <div className="velmere-skeleton mt-2 h-3 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
