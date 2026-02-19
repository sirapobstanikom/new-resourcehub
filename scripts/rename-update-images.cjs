const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'updates');

const mapping = {
  'Toyota Motor Europe.png': 'toyota-motor-europe.png',
  'ECO-friendly Home.png': 'eco-friendly-home.png',
  'เสิร์ฟความอร่อยพร้อมความรักษ์โลก.png': 'scoops-truck.png',
  '"เฟอร์นิเจอร์" ที่กินตัวเองได้.png': 'self-eating-furniture.png',
  'ฟาร์มแนวตั้งในร่มแห่งแรกของโลก! ปลูกสตรอว์เบอร์รี 4 ล้านปอนด์ต่อปีในพื้นที่ไม่ถึง 1 เอเคอร์.png': 'vertical-farm.png',
  'Lenovo เปิดตัว "Yoga Solar PC" โน้ตบุ๊กพลังแสงอาทิตย์เครื่องแรกของโลก พร้อมกองทัพ AI Laptop สุดล้ำ ในงาน MWC 2025.png': 'lenovo-yoga-solar.png',
  'จีนเปิดตัว "แบตเตอรี่ขนาดเหรียญ"ที่ใช้ได้นาน 50 ปี.png': 'atomic-battery.png',
  'Atlas หุ่นยนต์ฮิวแมนนอยด์ที่เคลื่อนไหวได้ลื่นไหลราวกับมนุษย์.png': 'atlas-robot.png',
  'นวัตกรรม AI วินิจฉัยมะเร็งได้เร็วยิ่งขึ้น ด้วยความแม่นยำเกือบ 100%.png': 'ai-cancer.png',
  'ขีดสุดของนวัตกรรม.png': 'stroke-robot.png',
};

if (!fs.existsSync(dir)) {
  console.error('Directory not found:', dir);
  process.exit(1);
}

const files = fs.readdirSync(dir);
let renamed = 0;
for (const oldName of Object.keys(mapping)) {
  const newName = mapping[oldName];
  const found = files.find((f) => f === oldName);
  if (found) {
    const src = path.join(dir, found);
    const dest = path.join(dir, newName);
    fs.renameSync(src, dest);
    console.log('Renamed:', found, '->', newName);
    renamed++;
  }
}
console.log('Done. Renamed', renamed, 'files.');
