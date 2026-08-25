import LuxurySection from "@/components/layout/LuxurySection";

type LegalSection = {
  title: string;
  body: string;
};

type LegalDraftPageProps = {
  kicker: string;
  title: string;
  updated: string;
  draftNotice: string;
  intro: string;
  sections: LegalSection[];
};

function MultilineBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function LegalDraftPage({
  kicker,
  title,
  updated,
  draftNotice,
  intro,
  sections,
}: LegalDraftPageProps) {
  return (
    <main
      className="min-h-[100dvh] bg-velmere-black text-velmere-ivory"
      data-pass2007-legal="single-document-no-card-stack"
    >
      <LuxurySection className="pt-28 pb-24 md:pt-36 md:pb-32">
        <article className="pass2007-legal-document mx-auto max-w-4xl rounded-[1.5rem] border border-white/[0.09] bg-[#090b0e] px-6 py-8 shadow-velmere-card md:px-10 md:py-12">
          <header>
            <p className="velmere-label text-cyan-100/[0.72]">{kicker}</p>
            <h1 className="mt-6 font-serif text-[clamp(3rem,7vw,6rem)] leading-[0.86] tracking-[-0.06em] text-white">{title}</h1>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/[0.42]">{updated}</p>
            <div className="mt-8 border-l-2 border-cyan-200/[0.30] bg-cyan-300/[0.035] px-5 py-4 text-sm leading-7 text-white/[0.68]">
              {draftNotice}
            </div>
            <p className="mt-8 max-w-3xl text-base leading-8 text-white/[0.62]">{intro}</p>
          </header>

          <div className="mt-10">
            {sections.map((section) => (
              <section key={section.title} className="pass2007-legal-section border-t border-white/[0.08] py-7 first:border-t-0 md:grid md:grid-cols-[minmax(11rem,.34fr)_minmax(0,.66fr)] md:gap-10">
                <h2 className="font-serif text-2xl tracking-[-0.035em] text-white md:text-3xl">{section.title}</h2>
                <p className="mt-4 text-sm leading-8 text-white/[0.62]">
                  <MultilineBody text={section.body} />
                </p>
              </section>
            ))}
          </div>
        </article>
      </LuxurySection>
    </main>
  );
}
