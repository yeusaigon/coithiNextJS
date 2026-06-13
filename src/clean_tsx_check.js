const fs = require('fs');
let code = fs.readFileSync('/Applications/XAMPP/xamppfiles/htdocs/coithi-NEXTJS/src/app/admin/income/page.tsx', 'utf8');

// Strip TypeScript generic types: e.g. <IncomeSettings>, <Schedule[]>, <number>, <any>, <string, number>
code = code.replace(/<([A-Za-z0-9_]+(?:\[\])?(?:\s*,\s*[A-Za-z0-9_]+(?:\[\])?)*)>/g, (match, p1) => {
  // If it's a known HTML tag like <div>, <p>, <a>, etc., keep it. Otherwise strip it.
  const lower = p1.toLowerCase().trim();
  if (['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'button', 'a', 'img', 'select', 'option', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'thead', 'tbody', 'label', 'input', 'form', 'textarea', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'header', 'footer', 'main', 'nav', 'aside', 'section', 'article', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'mark', 'code', 'pre', 'br', 'hr', 'iframe', 'canvas', 'svg', 'link', 'meta', 'title', 'head', 'body', 'html'].includes(lower)) {
    return match;
  }
  return '';
});

// Strip TSX comments {/* ... */}
code = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const lines = code.split('\n');
const stack = [];

for (let l = 0; l < lines.length; l++) {
  const line = lines[l];
  // Remove single line comments
  const cleanLine = line.replace(/\/\/.*/, '');
  
  // Find tags
  const tags = cleanLine.match(/<\/?[a-zA-Z0-9:]+\b[^>]*>|<\/?>/g) || [];
  for (const tag of tags) {
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
