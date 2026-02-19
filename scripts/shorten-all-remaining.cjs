const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'updates');
const files = fs.readdirSync(dir);

const MAX = 45;
let counter = 0;

for (const f of files) {
  if (f.length <= MAX) continue;
  const ext = path.extname(f);
  const newName = 'extra-' + (++counter) + ext;
  const src = path.join(dir, f);
  const dest = path.join(dir, newName);
  fs.renameSync(src, dest);
  console.log(f.substring(0, 50) + '... -> ' + newName);
}

console.log('Done. Shortened', counter, 'filenames.');
