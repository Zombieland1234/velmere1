const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/search/VelmereIntelligenceSearchClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetClick = `onClick={() => {
                  if (item.symbol === String.fromCharCode(66,67,72)) { setQuery(item.symbol); void executeSearch(item.symbol, String.fromCharCode(99,108,105,101,110,116)); } else if (item.symbol === String.fromCharCode(69,84,72)) { window.location.assign(String.fromCharCode(47) + safeLocale + String.fromCharCode(47,115,104,105,101,108,100,63,97,115,115,101,116,61,101,116,104,101,114,101,117,109)); } else if (item.symbol === String.fromCharCode(83,79,76)) { window.location.assign(String.fromCharCode(47) + safeLocale + String.fromCharCode(47,115,104,105,101,108,100,45,109,97,112,63,113,61,115,111,108,97,110,97)); } else if (item.symbol === String.fromCharCode(66,84,67)) { setQuery(item.symbol); void executeSearch(item.symbol, String.fromCharCode(99,108,105,101,110,116)); } else { setQuery(item.symbol); window.requestAnimationFrame(() => formRef.current?.focus?.()); }
                  window.requestAnimationFrame(() =>
                    formRef.current?.focus?.(),
                  );
                }}`;

const cleanClick = `onClick={() => {
                  if (item.symbol === "BCH") {
                    setQuery("BCH");
                    void executeSearch("BCH", "client");
                  } else if (item.symbol === "ETH") {
                    window.location.href = "/" + safeLocale + "/shield?asset=ethereum";
                  } else if (item.symbol === "SOL") {
                    window.location.href = "/" + safeLocale + "/shield-map?q=solana";
                  } else if (item.symbol === "BTC") {
                    setQuery("BTC");
                    void executeSearch("BTC", "client");
                    setPdfModalActive(true);
                  }
                }}`;

if (content.includes(targetClick)) {
  content = content.replace(targetClick, cleanClick);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully polished 4 Browser action cards!');
} else {
  console.log('targetClick not matched directly, checking...');
}
