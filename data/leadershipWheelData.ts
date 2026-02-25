export type RatingLevel = 'S' | 'ME' | 'AFI' | 'ASD';

export const RATING_LABELS: { [K in RatingLevel]: string } = {
  S: 'Strength',
  ME: 'Meets Expectations',
  AFI: 'Area for Improvement',
  ASD: 'Area of Significant Improvement',
};

/** คะแนนต่อระดับ: S=1, ME=2, AFI=3, ASD=4 */
export const RATING_SCORE: { [K in RatingLevel]: number } = {
  S: 1,
  ME: 2,
  AFI: 3,
  ASD: 4,
};

/** โจทย์เดียว — ผู้ใช้เลือก S / ME / AFI / ASD */
export interface LeadershipQuestion {
  id: string;
  title: string;
  description: string;
}

/** ข้อย่อย (เช่น SEE) — มี 3 โจทย์ */
export interface LeadershipSubItem {
  id: string;
  name: string;
  questions: LeadershipQuestion[];
}

export interface LeadershipDimension {
  id: string;
  name: string;
  subItems: LeadershipSubItem[];
}

/** รายการความสามารถแบบเดิม (flatten) — ใช้สำหรับผลลัพธ์/คะแนนตาม dimension */
export function getAllQuestionIds(dim: LeadershipDimension): string[] {
  const ids: string[] = [];
  dim.subItems.forEach((sub) => sub.questions.forEach((q) => ids.push(q.id)));
  return ids;
}

export const LEADERSHIP_DIMENSIONS: LeadershipDimension[] = [
  {
    id: 'aware',
    name: 'Be AWARE',
    subItems: [
      {
        id: 'see',
        name: 'SEE',
        questions: [
          {
            id: 'aware-see-1',
            title: 'สังเกต',
            description:
              'การสังเกตหรือรับรู้บางสิ่ง (รวมถึงพฤติกรรมที่เป็นคำพูดและไม่เป็นคำพูด สถานการณ์ และสภาพแวดล้อม) และบันทึก/ตระหนักว่าสิ่งนั้นมีความสำคัญ',
          },
          {
            id: 'aware-see-2',
            title: 'มีความใฝ่รู้',
            description:
              'การนำความคิดที่ตั้งคำถามมาใช้ แสดงออกถึงความกระตือรือร้นที่จะสำรวจ สืบค้น และเรียนรู้',
          },
          {
            id: 'aware-see-3',
            title: 'อยู่กับปัจจุบัน',
            description:
              'มอบความใส่ใจอย่างเต็มที่ต่อบุคคล (พฤติกรรม), สถานการณ์, สภาพแวดล้อม หรือประสบการณ์ และแสดงออกถึงการฟังอย่างตั้งใจและให้เกียรติ',
          },
        ],
      },
      {
        id: 'anticipate',
        name: 'ANTICIPATE',
        questions: [
          {
            id: 'aware-anticipate-1',
            title: 'คาดการณ์สถานการณ์',
            description:
              'การพิจารณาแนวโน้มและผลที่อาจเกิดขึ้นจากสถานการณ์ปัจจุบัน เพื่อเตรียมความพร้อม',
          },
          {
            id: 'aware-anticipate-2',
            title: 'มองเห็นโอกาสและความเสี่ยง',
            description:
              'การระบุโอกาสใหม่และความเสี่ยงที่อาจเกิดขึ้นล่วงหน้า จากข้อมูลและสัญญาณที่มี',
          },
          {
            id: 'aware-anticipate-3',
            title: 'เตรียมแผนสำรอง',
            description:
              'การคิดถึงทางเลือกและแผนสำรองเมื่อสถานการณ์เปลี่ยนไป เพื่อลดความไม่แน่นอน',
          },
        ],
      },
      {
        id: 'analyse',
        name: 'ANALYSE',
        questions: [
          {
            id: 'aware-analyse-1',
            title: 'แยกส่วนข้อมูล',
            description:
              'การแยกส่วนข้อมูล สถานการณ์ และสภาพแวดล้อมอย่างเป็นระบบ เพื่อเข้าใจองค์ประกอบและความสัมพันธ์',
          },
          {
            id: 'aware-analyse-2',
            title: 'สร้างความเชื่อมโยง',
            description:
              'การสร้างความเชื่อมโยงระหว่างข้อมูลหรือเหตุการณ์ต่างๆ และสรุปอย่างมีเหตุผล',
          },
          {
            id: 'aware-analyse-3',
            title: 'สรุปและตีความ',
            description:
              'การสรุปผลการวิเคราะห์และตีความความหมาย เพื่อนำไปใช้ในการตัดสินใจหรือวางแผน',
          },
        ],
      },
    ],
  },
  {
    id: 'adapt',
    name: 'ADAPT',
    subItems: [
      {
        id: 'assimilate',
        name: 'ASSIMILATE',
        questions: [
          {
            id: 'adapt-assimilate-1',
            title: 'รับข้อมูลใหม่',
            description:
              'การรับและเปิดใจต่อข้อมูลหรือประสบการณ์ใหม่ โดยไม่ปิดกั้นจากความเชื่อเดิม',
          },
          {
            id: 'adapt-assimilate-2',
            title: 'ผนวกเข้ากับความรู้เดิม',
            description:
              'การเชื่อมโยงข้อมูลใหม่เข้ากับความรู้หรือประสบการณ์เดิม เพื่อปรับความเข้าใจ',
          },
          {
            id: 'adapt-assimilate-3',
            title: 'อัปเดตวิธีคิด',
            description:
              'การปรับวิธีคิดหรือกรอบความคิดเมื่อมีหลักฐานหรือข้อมูลใหม่ที่เพียงพอ',
          },
        ],
      },
      {
        id: 'pivot',
        name: 'PIVOT',
        questions: [
          {
            id: 'adapt-pivot-1',
            title: 'ยืดหยุ่นต่อการเปลี่ยนแปลง',
            description:
              'การยอมรับการเปลี่ยนแปลงและพร้อมปรับทิศทางเมื่อสถานการณ์หรือข้อมูลเปลี่ยนไป',
          },
          {
            id: 'adapt-pivot-2',
            title: 'เปลี่ยนแนวทางเมื่อจำเป็น',
            description:
              'การตัดสินใจเปลี่ยนแนวทางหรือยุทธศาสตร์เมื่อแนวทางเดิมไม่บรรลุผลหรือไม่เหมาะสม',
          },
          {
            id: 'adapt-pivot-3',
            title: 'เรียนรู้จากสถานการณ์ใหม่',
            description:
              'การดึงบทเรียนจากสถานการณ์ใหม่และนำไปใช้ปรับปรุงการทำงานหรือการตัดสินใจ',
          },
        ],
      },
      {
        id: 'accommodate',
        name: 'ACCOMMODATE',
        questions: [
          {
            id: 'adapt-accommodate-1',
            title: 'ปรับตัวต่อบริบท',
            description:
              'การปรับวิธีทำงานหรือการสื่อสารให้สอดคล้องกับบริบท ความต้องการ และข้อจำกัดที่แตกต่างกัน',
          },
          {
            id: 'adapt-accommodate-2',
            title: 'จัดลำดับความสำคัญใหม่',
            description:
              'การจัดลำดับความสำคัญและจัดสรรทรัพยากรใหม่เมื่อมีข้อจำกัดหรือความต้องการที่เปลี่ยนไป',
          },
          {
            id: 'adapt-accommodate-3',
            title: 'สร้างความสมดุล',
            description:
              'การสร้างความสมดุลระหว่างความต้องการของหลายฝ่ายหรือหลายเป้าหมายภายใต้ข้อจำกัด',
          },
        ],
      },
    ],
  },
  {
    id: 'act',
    name: 'ACT',
    subItems: [
      {
        id: 'decide',
        name: 'DECIDE',
        questions: [
          {
            id: 'act-decide-1',
            title: 'รวบรวมข้อมูลเพื่อตัดสินใจ',
            description:
              'การรวบรวมข้อมูลที่จำเป็นและพิจารณาทางเลือกก่อนตัดสินใจอย่างมีหลักการ',
          },
          {
            id: 'act-decide-2',
            title: 'เปรียบเทียบทางเลือก',
            description:
              'การเปรียบเทียบทางเลือกตามเกณฑ์ที่ชัดเจน และชั่งน้ำหนักข้อดีข้อเสีย',
          },
          {
            id: 'act-decide-3',
            title: 'ตัดสินใจและรับผิดชอบ',
            description:
              'การตัดสินใจอย่างเด็ดขาดและรับผิดชอบต่อผลที่ตามมา รวมถึงการสื่อสารให้ผู้เกี่ยวข้องทราบ',
          },
        ],
      },
      {
        id: 'resource',
        name: 'RESOURCE',
        questions: [
          {
            id: 'act-resource-1',
            title: 'จัดสรรทรัพยากร',
            description:
              'การจัดสรรทรัพยากร (คน เวลา งบประมาณ) อย่างเหมาะสมกับเป้าหมายและความสำคัญ',
          },
          {
            id: 'act-resource-2',
            title: 'ใช้ทรัพยากรอย่างมีประสิทธิภาพ',
            description:
              'การใช้ทรัพยากรอย่างมีประสิทธิภาพและหลีกเลี่ยงการสูญเปล่า เพื่อบรรลุผลลัพธ์ตามเป้า',
          },
          {
            id: 'act-resource-3',
            title: 'ติดตามและปรับการจัดสรร',
            description:
              'การติดตามการใช้ทรัพยากรและปรับการจัดสรรเมื่อสถานการณ์เปลี่ยนไป',
          },
        ],
      },
      {
        id: 'act-item',
        name: 'ACT',
        questions: [
          {
            id: 'act-act-1',
            title: 'แปลงแผนเป็นการกระทำ',
            description:
              'การแปลงแผนหรือเป้าหมายเป็นการกระทำที่ชัดเจน ด้วยความรับผิดชอบและความต่อเนื่อง',
          },
          {
            id: 'act-act-2',
            title: 'มุ่งเน้นผลลัพธ์',
            description:
              'การมุ่งเน้นผลลัพธ์ คุณภาพ และการส่งมอบตามเป้าหมายที่กำหนด',
          },
          {
            id: 'act-act-3',
            title: 'สื่อสารและทำงานเป็นทีม',
            description:
              'การสื่อสารชัดเจนกับผู้เกี่ยวข้อง และสร้างความร่วมมือเพื่อให้งานบรรลุผล',
          },
        ],
      },
    ],
  },
];

export const DIMENSION_DESCRIPTIONS: { [dimId: string]: string } = {
  aware: 'Be AWARE — SEE (สังเกต/รับรู้), ANTICIPATE (คาดการณ์), ANALYSE (วิเคราะห์)',
  adapt: 'ADAPT — ASSIMILATE (ผนวกข้อมูล), PIVOT (เปลี่ยนทิศทาง), ACCOMMODATE (ปรับตัว)',
  act: 'ACT — DECIDE (ตัดสินใจ), RESOURCE (จัดสรรทรัพยากร), ACT (ลงมือทำ)',
};
