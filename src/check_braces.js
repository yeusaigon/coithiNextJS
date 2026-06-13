const fs = require('fs');
const code = fs.readFileSync('/Applications/XAMPP/xamppfiles/htdocs/coithi-NEXTJS/src/app/admin/income/page.tsx', 'utf8');

// Simple regex to extract tags
const tagRegex = /<\/?[a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+(?:=(?:"[^"]*"|'[^']*'|{[^}]*}|[^>\s]+))?)*\s*\/?>|<\/?>/g;
let match;
const stack = [];
let lineNum = 1;

const lines = code.split('\n');

for (let l = 0; l < lines.length; l++) {
  const line = lines[l];
  // Remove comments
  const cleanLine = line.replace(/\{\/\*.*?\*\/\}/g, '').replace(/\/\/.*/, '');
  
  // Find tags
  const tags = cleanLine.match(/<\/?[a-zA-Z0-9:]+\b[^>]*>|<\/?>/g) || [];
  for (const tag of tags) {
    if (tag.startsWith('<!--') || tag.startsWith('<!')) continue;
    if (tag.endsWith('/>')) continue; // self closing
    
    // Extract tag name
    const nameMatch = tag.match(/<\/?([a-zA-Z0-9:]+)/);
    if (!nameMatch) {
      if (tag === '<>') {
        stack.push({ name: '<>', line: l + 1 });
      } else if (tag === '</>') {
        const last = stack.pop();
        if (!last || last.name !== '<>') {
          console.log(`Error: Found </ shadow close at line ${l + 1}, expected matching <> but got ${last ? last.name : 'empty stack'}`);
        }
      }
      continue;
    }
    
    const tagName = nameMatch[1];
    const isClosing = tag.startsWith('</');
    
    if (isClosing) {
      const last = stack.pop();
      if (!last || last.name !== tagName) {
        console.log(`Mismatch: Found </${tagName}> at line ${l + 1}, expected matching tag for <${last ? last.name : 'empty stack'}> from line ${last ? last.line : 'N/A'}`);
      }
    } else {
      stack.push({ name: tagName, line: l + 1 });
    }
  }
}

console.log("Remaining stack:", stack);
