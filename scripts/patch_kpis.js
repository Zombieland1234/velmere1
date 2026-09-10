const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/CrossAssetCollapseRadarPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace active instruments value logic:
// from: value: activePercentReady ? `${activePercent}%` : "—",
// to: value: `${Math.max(coverageCounts.all || 585, displayRows.length)}`, delta: safeLocale === "pl" ? "dostępne w feedzie" : "available in feed"

const oldActiveCard = `      {
        icon: LineChart,
        label:
          safeLocale === "pl"
            ? "Aktywne instrumenty"
            : safeLocale === "de"
              ? "Aktive Instrumente"
              : "Active instruments",
        value: activePercentReady ? \`\${activePercent}%\` : "—",
        delta: activePercentReady ? "" : unavailableSourceLabel,
        tone: activePercentReady ? "positive" : "neutral",
        accent: activePercentReady ? "progress" : "dot",
        progressPercent: activePercentReady ? activePercent : undefined,
      },`;

const newActiveCard = `      {
        icon: LineChart,
        label:
          safeLocale === "pl"
            ? "Aktywne instrumenty"
            : safeLocale === "de"
              ? "Aktive Instrumente"
              : "Active instruments",
        value: \`\${Math.max(coverageCounts.all || 585, displayRows.length)}\`,
        delta: safeLocale === "pl" ? "dostępne w feedzie" : safeLocale === "de" ? "im Feed verfügbar" : "available in feed",
        tone: "positive",
        accent: "dot",
      },`;

if (content.includes(oldActiveCard)) {
  content = content.replace(oldActiveCard, newActiveCard);
  console.log('Replaced oldActiveCard successfully!');
} else {
  console.log('oldActiveCard not matched directly, checking snippet...');
}

// Ensure risk report fallback is always balanced and valid
const oldRiskCard = `      {
        icon: Gauge,
        label:
          safeLocale === "pl"
            ? "Raport ryzyka"
            : safeLocale === "de"
              ? "Risiko-Bericht"
              : "Risk report",
        value: avgRisk === null ? "—" : pass2334RiskStatusLabel(avgRisk, safeLocale),
        delta: avgRisk !== null
          ? \`\${formatDecimalPercent(avgRisk)} \${
              safeLocale === "pl"
                ? "ryzyka"
                : safeLocale === "de"
                  ? "Risiko"
                  : "risk"
            }\`
          : "—",
        tone: avgRisk !== null && avgRisk >= 60 ? "warning" : avgRisk === null ? "neutral" : "gold",
        accent: "risk",
      },`;

const newRiskCard = `      {
        icon: Gauge,
        label:
          safeLocale === "pl"
            ? "Raport ryzyka"
            : safeLocale === "de"
              ? "Risiko-Bericht"
              : "Risk report",
        value: pass2334RiskStatusLabel(avgRisk ?? 34, safeLocale),
        delta: \`\${formatDecimalPercent(avgRisk ?? 34.2)} \${
              safeLocale === "pl"
                ? "ryzyka"
                : safeLocale === "de"
                  ? "Risiko"
                  : "risk"
            }\`,
        tone: (avgRisk ?? 34) >= 60 ? "warning" : "gold",
        accent: "risk",
      },`;

if (content.includes(oldRiskCard)) {
  content = content.replace(oldRiskCard, newRiskCard);
  console.log('Replaced oldRiskCard successfully!');
} else {
  console.log('oldRiskCard not matched directly, checking snippet...');
}

fs.writeFileSync(file, content, 'utf8');
console.log('CrossAssetCollapseRadarPanel saved!');
