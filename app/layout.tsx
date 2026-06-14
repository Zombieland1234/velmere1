import "./globals.css";
import HtmlLangSync from "@/components/i18n/HtmlLangSync";

const setLangScript = `(() => {
  try {
    var locale = window.location.pathname.split('/').filter(Boolean)[0];
    document.documentElement.lang = ['pl','en','de'].includes(locale) ? locale : 'en';
  } catch (_) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="no-scrollbar overflow-x-clip antialiased [backface-visibility:hidden]">
      <body className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: setLangScript }} />
        <HtmlLangSync />
        <a href="#main-content" className="velmere-skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-full focus:bg-velmere-ivory focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-black">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
