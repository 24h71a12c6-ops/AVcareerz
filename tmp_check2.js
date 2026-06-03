const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'includes', 'Frontend', 'script.js');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split(/\r?\n/);
const start = 3229, end = 4422;
let brace = 0, paren = 0;
for (let idx = start; idx < end; idx++) {
  const line = lines[idx];
  for (let ch of line) {
    if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
  }
  if ((idx - start) % 20 === 0 || brace >= 3 || brace <= -1) {
    console.log(`${idx+1}: brace=${brace} paren=${paren} ${line.trim()}`);
  }
}
console.log('final', brace, paren);
