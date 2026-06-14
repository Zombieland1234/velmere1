type RouteLoadingShellProps = {
  label?: string;
};

export default function RouteLoadingShell({ label = "Velmère" }: RouteLoadingShellProps) {
  return (
    <main
      className="min-h-[100dvh] bg-velmere-black px-4 pb-20 pt-28 text-velmere-ivory md:px-8 md:pt-32"
      aria-busy="true"
      aria-live="polite"
      data-pass2007-shared-route-loading="stable-solid-low-motion"
    >
      <div className="mx-auto w-full max-w-[94rem]">
        <span className="sr-only">{label}</span>
        <div className="h-3 w-28 animate-pulse rounded-full bg-cyan-200/[0.14] motion-reduce:animate-none" />
        <div className="mt-5 h-12 w-[min(34rem,82vw)] animate-pulse rounded-2xl bg-white/[0.07] motion-reduce:animate-none" />
        <div className="mt-4 h-4 w-[min(42rem,88vw)] animate-pulse rounded-full bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div className="min-h-[24rem] animate-pulse rounded-[1.5rem] border border-white/[0.08] bg-[#090b0e] motion-reduce:animate-none" />
          <div className="min-h-[24rem] animate-pulse rounded-[1.5rem] border border-white/[0.08] bg-[#090b0e] motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}
