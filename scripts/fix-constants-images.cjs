const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'constants.tsx');
let s = fs.readFileSync(p, 'utf8');

// Fix the 3 long image paths (curly quotes in source)
const a = '\u201C'; // "
const b = '\u201D'; // "
s = s.replace(`/updates/${a}เฟอร์นิเจอร์${b} ที่กินตัวเองได้.png`, '/updates/self-eating-furniture.png');
s = s.replace(/\/updates\/Lenovo เปิดตัว[^']+\.png/, '/updates/lenovo-yoga-solar.png');
s = s.replace(/\/updates\/จีนเปิดตัว[^']+\.png/, '/updates/atomic-battery.png');

fs.writeFileSync(p, s);
console.log('constants.tsx image paths updated.');
