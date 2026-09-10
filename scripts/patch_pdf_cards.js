const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/lib/security/pro-audit-pdf/customer-safe-renderer.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace basic text rendering in page stream with styled luxury header line and section divider cards
const oldCommands = `    const commands = [
      "BT", "/F2 18 Tf", "44 800 Td", \`\${encodeProAuditPdfHexText(plan.title)} Tj\`, "ET",
      "BT", "/F1 9 Tf", "44 776 Td", \`\${encodeProAuditPdfHexText(plan.subtitle)} Tj\`, "ET",
    ];`;

const newCommands = `    const commands = [
      // Top luxury gold accent bar
      "0.77 0.62 0.31 rg", "44 822 507 2.5 re", "f",
      // Header typography
      "0 0 0 rg",
      "BT", "/F2 18 Tf", "44 796 Td", \`\${encodeProAuditPdfHexText(plan.title)} Tj\`, "ET",
      "0.4 0.4 0.4 rg",
      "BT", "/F1 9 Tf", "44 776 Td", \`\${encodeProAuditPdfHexText(plan.subtitle)} Tj\`, "ET",
      // Thin header divider rule
      "0.88 0.88 0.88 RG", "0.75 w", "44 766 m", "551 766 l", "S",
      "0 0 0 rg"
    ];`;

if (content.includes(oldCommands)) {
  content = content.replace(oldCommands, newCommands);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully injected luxury header rule and accent in customer-safe-renderer.ts!');
} else {
  console.log('oldCommands not matched directly in customer-safe-renderer');
}
