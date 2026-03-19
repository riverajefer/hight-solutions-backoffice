const fs = require('fs');
const lines = fs.readFileSync('coverage_output.txt', 'utf8').split('\n');
const tableLines = lines.filter(l => l.includes('|'));
for(let l of tableLines) {
  const parts = l.split('|').map(p => p.trim());
  if(parts.length > 2) {
    const name = parts[0];
    const stmt = parseFloat(parts[1]);
    if(stmt < 80 && !Number.isNaN(stmt)) {
      console.log(name.padEnd(30, ' ') + stmt + '%');
    }
  }
}
