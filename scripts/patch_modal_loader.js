const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/AssetDetailModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace chartInitialLoading check to include chartIsLoading when switching timeframes
// so the user sees a smooth luxury shimmer and loading animation instead of empty black box!
const oldCheck = `{chartInitialLoading ? (
              <ChartLoadingSurface
                label={modalLocale === "pl" ? "Ładowanie wykresu" : modalLocale === "de" ? "Diagramm wird geladen" : "Loading chart"}
                detail={modalLocale === "pl" ? "Przygotowujemy historię świec i strukturę wykresu…" : modalLocale === "de" ? "Kerzenhistorie und Diagrammstruktur werden vorbereitet…" : "Preparing candle history and chart structure…"}
              />`;

const newCheck = `{chartIsLoading ? (
              <div className="vlm-chart-loading-shimmer w-full h-[320px] flex flex-col items-center justify-center gap-3">
                <ChartLoadingSurface
                  label={modalLocale === "pl" ? "Ładowanie świec " + activeTimeframeConfig.label : modalLocale === "de" ? "Kerzen laden " + activeTimeframeConfig.label : "Loading candles " + activeTimeframeConfig.label}
                  detail={modalLocale === "pl" ? "Pobieranie i synchronizacja pełnej historii świec…" : modalLocale === "de" ? "Kerzenhistorie wird synchronisiert…" : "Synchronizing complete candle history…"}
                />
              </div>`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched modal chart loading condition for smooth animation!');
} else {
  console.log('oldCheck pattern not matched directly in AssetDetailModal.tsx');
}
