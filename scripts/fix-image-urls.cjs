const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'constants.tsx');
let s = fs.readFileSync(p, 'utf8');

// Replace any remaining /updates/... image paths with Unsplash URLs
s = s.replace(/image: '\/updates\/[^']+\.png',/g, "image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop',");

fs.writeFileSync(p, s);
console.log('Done. All /updates/ image paths replaced with URLs.');
