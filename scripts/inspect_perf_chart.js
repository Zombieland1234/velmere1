const fs = require('fs');
const file = 'C:/Users/marci/Desktop/Nowy folder/components/market-integrity/VelmerePerformanceChart.tsx';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('VelmerePerformanceChart lines:', content.split('\n').length);
} else {
  console.log('VelmerePerformanceChart not found at direct path, searching...');
}
