const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'updates');
const files = fs.readdirSync(dir);

// Match by substring and rename to short name
const rules = [
  { test: (n) => n.includes('Lenovo') && n.includes('Yoga'), newName: 'lenovo-yoga-solar.png' },
  { test: (n) => n.includes('แบตเตอรี่') || (n.includes('50') && n.includes('ปี')), newName: 'atomic-battery.png' },
  { test: (n) => n.includes('เฟอร์นิเจอร์') || n.includes('กินตัวเอง'), newName: 'self-eating-furniture.png' },
];

for (const file of files) {
  if (file.length < 40) continue; // already short
  for (const { test, newName } of rules) {
    if (test(file)) {
      const src = path.join(dir, file);
      const dest = path.join(dir, newName);
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest);
        console.log('Renamed:', file.substring(0, 50) + '...', '->', newName);
      }
      break;
    }
  }
}
