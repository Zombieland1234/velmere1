const fs = require('fs');

// 1. Update HomePageClient.tsx
const homePath = 'C:/Users/marci/Desktop/Nowy folder/components/home/HomePageClient.tsx';
let home = fs.readFileSync(homePath, 'utf8');
if (!home.includes('VelmereLuxuryShield')) {
  home = home.replace(
    'import NeuralBrainVisual from "@/components/home/NeuralBrainVisual";',
    'import NeuralBrainVisual from "@/components/home/NeuralBrainVisual";\nimport VelmereLuxuryShield from "@/components/ui/VelmereLuxuryShield";'
  );
  home = home.replace('<NeuralBrainVisual />', '<VelmereLuxuryShield size={380} />');
  fs.writeFileSync(homePath, home, 'utf8');
  console.log('HomePageClient patched with VelmereLuxuryShield!');
} else {
  console.log('HomePageClient already has VelmereLuxuryShield.');
}

// 2. Update VelmereIntelligenceSearchClient.tsx (Browser page)
const searchPath = 'C:/Users/marci/Desktop/Nowy folder/components/search/VelmereIntelligenceSearchClient.tsx';
let search = fs.readFileSync(searchPath, 'utf8');
if (!search.includes('VelmereLuxuryShield')) {
  search = search.replace(
    'import PremiumAmbientGlobe from "@/components/ui/PremiumAmbientGlobe";',
    'import PremiumAmbientGlobe from "@/components/ui/PremiumAmbientGlobe";\nimport VelmereLuxuryShield from "@/components/ui/VelmereLuxuryShield";'
  );
  search = search.replace(
    '<PremiumAmbientGlobe className="browser-ambient-globe" tone="teal" />',
    '<div className="browser-ambient-globe flex items-center justify-center pointer-events-none select-none my-[-20px]"><VelmereLuxuryShield size={320} /></div>'
  );
  fs.writeFileSync(searchPath, search, 'utf8');
  console.log('VelmereIntelligenceSearchClient patched with VelmereLuxuryShield!');
} else {
  console.log('VelmereIntelligenceSearchClient already has VelmereLuxuryShield.');
}
