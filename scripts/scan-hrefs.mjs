import fs from 'fs';
import path from 'path';

const allHrefs = new Set();

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /href=\{?["']([^"'`]+)["']\}?/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (!match[1].startsWith('http') && !match[1].startsWith('#')) {
          allHrefs.add(JSON.stringify({ href: match[1], file: path.relative('.', fullPath).replace(/\\/g, '/') }));
        }
      }
    }
  }
}

scanDir('src');
const list = Array.from(allHrefs).map(s => JSON.parse(s));
list.sort((a,b) => a.href.localeCompare(b.href));
console.log(JSON.stringify(list, null, 2));

