/** มิติการให้คะแนน MindDoJo Communication Assessment — ต้องสอดคล้องกับ prompt จำลองและรายงาน AI */

export type MindDojoDimensionKey =
  | 'clarity'
  | 'structure'
  | 'empathy'
  | 'activeListening'
  | 'persuasion'
  | 'professionalTone';

export const MINDDOJO_DIMENSIONS: {
  key: MindDojoDimensionKey;
  labelEn: string;
  labelTh: string;
  descriptionTh: string;
}[] = [
  {
    key: 'clarity',
    labelEn: 'Clarity',
    labelTh: 'ความชัดเจนในการสื่อสาร',
    descriptionTh: 'สื่อสารประเด็นหลัก ใช้ภาษาที่เข้าใจง่าย ไม่คลุมเครือเกินไป',
  },
  {
    key: 'structure',
    labelEn: 'Structure',
    labelTh: 'โครงสร้างการพูด / การเรียบเรียง',
    descriptionTh: 'ลำดับความคิด หัวข้อ–เหตุผล–ข้อเสนอ ชัดเจนและตามได้',
  },
  {
    key: 'empathy',
    labelEn: 'Empathy',
    labelTh: 'ความเข้าใจและใส่ใจความรู้สึกอีกฝ่าย',
    descriptionTh: 'รับรู้อารมณ์ มุมมอง และความกังวลของอีกฝ่ายอย่างเหมาะสม',
  },
  {
    key: 'activeListening',
    labelEn: 'Active Listening',
    labelTh: 'การฟังและตอบสนองอย่างตั้งใจ',
    descriptionTh: 'ถามต่อ สะท้อนความเข้าใจ อ้างอิงสิ่งที่อีกฝ่ายพูด ไม่ตัดบทแบบหลุดประเด็น',
  },
  {
    key: 'persuasion',
    labelEn: 'Persuasion',
    labelTh: 'ความสามารถในการโน้มน้าว',
    descriptionTh: 'ใช้เหตุผล ประโยชน์ร่วม หรือหลักฐานที่เกี่ยวข้องเพื่อเคลื่อนบทสนทนา',
  },
  {
    key: 'professionalTone',
    labelEn: 'Professional Tone',
    labelTh: 'น้ำเสียงความเป็นมืออาชีพ',
    descriptionTh: 'สุภาพ ควบคุมอารมณ์ เหมาะกับบริบทองค์กร แม้ใต้ความกดดัน',
  },
];

export const MINDDOJO_REPORT_STORAGE_KEY = 'minddojo_assessment_report_v1';
