const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/ShieldProCleanTerminalClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldSparkline = `function Sparkline({ values }: { values?: number[] }) {
  const clean = (values ?? []).filter(finite).slice(-84);
  if (clean.length < 2) return <span className="shield-pro-v4608-empty-spark">—</span>;
  const width = 118;
  const height = 34;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = Math.max(max - min, Math.abs(max) * 0.0001, 1e-9);
  const d = clean
    .map((value, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return \`\${index === 0 ? "M" : "L"}\${x.toFixed(2)} \${y.toFixed(2)}\`;
    })
    .join(" ");
  const direction = clean.at(-1)! >= clean[0]! ? "positive" : "negative";
  return (
    <svg className="shield-pro-v4608-spark" viewBox={\`0 0 \${width} \${height}\`} data-direction={direction} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}`;

const newSparkline = `function Sparkline({ values }: { values?: number[] }) {
  let clean = (values ?? []).filter(finite);
  const width = 124;
  const height = 34;
  
  if (clean.length < 2) {
    return <span className="shield-pro-v4608-empty-spark">—</span>;
  }
  
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = Math.max(max - min, Math.abs(max) * 0.0001, 1e-9);
  const d = clean
    .map((value, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return \`\${index === 0 ? "M" : "L"}\${x.toFixed(2)} \${y.toFixed(2)}\`;
    })
    .join(" ");
  const direction = clean.at(-1)! >= clean[0]! ? "positive" : "negative";
  
  // Real Markets monochrome luxury styling: subtler stroke and smooth line
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
      <svg className="shield-pro-v4608-spark" viewBox={\`0 0 \${width} \${height}\`} style={{ width: 110, height: 28 }} data-direction={direction} aria-hidden="true">
        <path d={d} fill="none" stroke={direction === "positive" ? "#3dd68c" : "#e05353"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}`;

if (content.includes(oldSparkline)) {
  content = content.replace(oldSparkline, newSparkline);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched Sparkline in ShieldProCleanTerminalClient.tsx!');
} else {
  console.log('oldSparkline pattern not matched directly in ShieldPro');
}
