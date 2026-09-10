const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/audit-canonical-report.ts';
let content = fs.readFileSync(file, 'utf8');

// Ensure that when locale is "pl", all lines generated in canonicalReportToPdfLines use 100% pure professional Polish!
const oldLinesGen = `function canonicalReportToPdfLines(report: CanonicalAuditReportModel): string[] {
  const lines: string[] = [];

  lines.push(\`VELMERE SECURITY AUDIT REPORT: \${report.target.contractName.toUpperCase()}\`);
  lines.push(\`Target Address: \${report.target.contractAddress}\`);
  lines.push(\`Network: \${report.target.network} (Chain ID: \${report.target.chainId})\`);
  lines.push(\`Report ID: \${report.reportId} | Entitlement Tier: \${report.clientEntitlementTier.toUpperCase()}\`);
  lines.push(\`Created At: \${report.createdAt}\`);
  lines.push("");

  lines.push(\`VERDICT SUMMARY: \${report.verdict.riskLabel} (\${report.verdict.riskScore}/100)\`);
  lines.push(\`Confidence Score: \${report.verdict.confidenceScore}/100 | Evidence Coverage: \${report.verdict.evidenceCoverage}%\`);`;

const newLinesGen = `function canonicalReportToPdfLines(report: CanonicalAuditReportModel): string[] {
  const lines: string[] = [];
  const isPl = report.locale === "pl";
  const isDe = report.locale === "de";

  const tContract = isPl ? "Badany kontrakt" : isDe ? "Geprüfter Vertrag" : "Audited Contract";
  const tNetwork = isPl ? "Sieć" : isDe ? "Netzwerk" : "Network";
  const tCreated = isPl ? "Data wygenerowania" : isDe ? "Erstellt am" : "Created At";
  const tVerdict = isPl ? "WERDYKT KOŃCOWY" : isDe ? "ENDGÜLTIGES URTEIL" : "VERDICT SUMMARY";
  const tConfidence = isPl ? "Wskaźnik pewności" : isDe ? "Konfidenzwert" : "Confidence Score";
  const tCoverage = isPl ? "Pokrycie dowodami" : isDe ? "Beweisabdeckung" : "Evidence Coverage";
  const tFindings = isPl ? "Zidentyfikowane ustalenia" : isDe ? "Identifizierte Befunde" : "Identified Findings";

  lines.push(isPl ? \`RAPORT BEZPIECZEŃSTWA VELMÈRE: \${report.target.contractName.toUpperCase()}\` : \`VELMERE SECURITY AUDIT REPORT: \${report.target.contractName.toUpperCase()}\`);
  lines.push(\`\${tContract}: \${report.target.contractAddress}\`);
  lines.push(\`\${tNetwork}: \${report.target.network} (Chain ID: \${report.target.chainId})\`);
  lines.push(\`ID Raportu: \${report.reportId} | Tier: \${report.clientEntitlementTier.toUpperCase()}\`);
  lines.push(\`\${tCreated}: \${report.createdAt}\`);
  lines.push("");

  lines.push(\`\${tVerdict}: \${report.verdict.riskLabel} (\${report.verdict.riskScore}/100)\`);
  lines.push(\`\${tConfidence}: \${report.verdict.confidenceScore}/100 | \${tCoverage}: \${report.verdict.evidenceCoverage}%\`);`;

if (content.includes(oldLinesGen)) {
  content = content.replace(oldLinesGen, newLinesGen);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully patched translation in audit-canonical-report.ts!');
} else {
  console.log('oldLinesGen not matched directly in audit-canonical-report.ts');
}
