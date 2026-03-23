/**
 * แบบทดสอบ 6 ช่องทางในการโน้มน้าวจูงใจ
 * อ้างอิง MindDoJo Persuasion Test: https://www.minddojo.co.th/mdj-persuasion-test
 * 30 ข้อ แต่ละข้อเลือก 1 จาก 2 ข้อความที่ตรงกับตัวตนมากที่สุด
 */

export type PersuasionChannelId =
  | 'authority'   // อำนาจ
  | 'logic'       // ข้อมูล/เหตุผล
  | 'vision'      // ภาพรวม/เป้าหมาย
  | 'relationship' // ความสัมพันธ์/มิตร
  | 'negotiation' // เจรจาต่อรอง
  | 'influence';  // แรงบันดาลใจ/เครือข่าย

export interface PersuasionQuestionItem {
  id: string;
  option1: { text: string; channel: PersuasionChannelId };
  option2: { text: string; channel: PersuasionChannelId };
}

export const PERSUASION_CHANNEL_LABELS: Record<PersuasionChannelId, string> = {
  authority: 'อำนาจ',
  logic: 'ข้อมูลและเหตุผล',
  vision: 'ภาพรวมและเป้าหมาย',
  relationship: 'ความสัมพันธ์และมิตรภาพ',
  negotiation: 'เจรจาต่อรอง',
  influence: 'แรงบันดาลใจและเครือข่าย',
};

/** ชื่อช่องทางภาษาอังกฤษสำหรับแดชบอร์ดผลลัพธ์ (ตาม MindDoJo test1) */
export const PERSUASION_CHANNEL_DASHBOARD_LABELS: Record<PersuasionChannelId, string> = {
  authority: 'Authority',
  logic: 'Rationality',
  vision: 'Vision',
  relationship: 'Relationship',
  negotiation: 'Politics',
  influence: 'Interest-Based',
};

export const PERSUASION_CHANNEL_DESCRIPTIONS: Record<PersuasionChannelId, string> = {
  authority:
    'อำนาจ (Authority Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการใช้อำนาจหน้าที่ที่คุณมี เพื่อให้พวกเขาทำตามที่คุณต้องการ แต่ก็ไม่ได้หมายความว่าคุณจะใช้อำนาจบังคับพวกเขาเสมอไป คุณอาจจะใช้นโยบาย กฎกติกา หรือข้อบังคับ มาใช้ในการโน้มน้าว หรือหากพวกเขามีข้อตกลงหรือสัญญากับคุณไว้ คุณจะใช้สิ่งเหล่านั้นมาโน้มน้าวใจพวกเขา.',
  logic:
    'เหตุผล (Rationality Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการใช้หลักการและเหตุผล คุณมักจะแสดงหลักฐานพร้อมกับข้อมูลที่ชัดเจนก่อนจะโน้มน้าวจูงใจผู้อื่นเสมอ',
  vision:
    'วิสัยทัศน์ (Vision Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการดูจากความชอบ หรือความเชื่อ ของพวกเขา คุณจะแสดงให้เห็นถึงคุณค่าเมื่อพวกเขาแสดงพฤติกรรมหรือกระทำบางอย่าง เพื่อทำให้พวกเขารู้สึกถึงผลลัพธ์ที่ได้ในอนาคต',
  relationship:
    'ความสัมพันธ์ (Relationships Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการใช้ความรู้จักและใกล้ชิดสนิทสนม หรือความสัมพันธ์บางอย่างที่เคยมีมาระหว่างคุณกับพวกเขา คุณรู้ว่าการใช้ความปรองดองจะทำให้ได้มาซึ่งสิ่งที่คุณต้องการ การมีบุญคุณซึ่งกันและกัน เป็นการแลกเปลี่ยนผลประโยชน์ระหว่างกันที่ดี',
  influence:
    'ความสนใจ (Interest Based Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการแสดงให้เห็นถึงคุณค่าหรือประโยชน์ที่พวกเขาจะได้รับ เน้นไปที่ความคาดหวังของพวกเขา แล้วพยายามแสดงให้พวกเขาเห็นว่าคุณสามารถแก้ไขปัญหาที่พวกเขากำลังเจอได้',
  negotiation:
    'การเมือง (Politics Persuasion) คุณมักจะใช้วิธีการโน้มน้าวใจผู้อื่นด้วยการให้คนหมู่มากมาช่วยสนับสนุนความคิดของคุณ คุณจะไม่โน้มน้าวคนเดียว แต่จะหาพันธมิตรคอยเป็นกำลังช่วยให้คุณโน้มน้าวได้ดีมากยิ่งขึ้น',
};

/** ข้อคำถาม 30 ข้อ แบบเลือก 1 จาก 2 ข้อความ (ตามเว็บ MindDoJo Persuasion Test) */
export const PERSUASION_QUESTIONS: PersuasionQuestionItem[] = [
  { id: 'p1', option1: { text: 'ฉันใช้อำนาจในบางครั้ง', channel: 'authority' }, option2: { text: 'ฉันใช้ข้อมูลเป็นการอธิบาย', channel: 'logic' } },
  { id: 'p2', option1: { text: 'ฉันวาดภาพรวมให้เห็น', channel: 'vision' }, option2: { text: 'ฉันพยายามเป็นมิตรกับคนที่ฉันต้องการชักจูงใจ', channel: 'relationship' } },
  { id: 'p3', option1: { text: 'ฉันใช้ข้อมูลรายละเอียดสนับสนุนข้อคิดเห็นของฉัน', channel: 'logic' }, option2: { text: 'ฉันสร้างความสัมพันธ์อันดีกับผู้อื่น', channel: 'relationship' } },
  { id: 'p4', option1: { text: 'ฉันใช้อำนาจหน้าที่เพื่อช่วยให้บรรลุเป้าหมาย', channel: 'authority' }, option2: { text: 'ฉันเจรจาต่อรองเพื่อให้ทุกคนพอใจ', channel: 'influence' } },
  { id: 'p5', option1: { text: 'ฉันอธิบายเหตุผลของข้อเสนอ', channel: 'logic' }, option2: { text: 'ฉันยึดหลักการให้และรับเพื่อให้งานสำเร็จ', channel: 'influence' } },
  { id: 'p6', option1: { text: 'ฉันพยายามที่จะสร้างแรงบันดาลใจให้ผู้อื่น', channel: 'vision' }, option2: { text: 'ฉันหาพรรคพวกเมื่อจำเป็น', channel: 'negotiation' } },
  { id: 'p7', option1: { text: 'ฉันเจรจาต่อรองเพื่อได้รับการสนับสนุนจากผู้อื่นเรื่อยๆ', channel: 'influence' }, option2: { text: 'ฉันเน้นเป้าหมายรวมขององค์กร', channel: 'vision' } },
  { id: 'p8', option1: { text: 'ฉันอาศัยอำนาจทุกอย่างที่มี', channel: 'authority' }, option2: { text: 'ฉันช่วยเหลือผู้อื่นเพื่อสร้างความสัมพันธ์ที่ดี', channel: 'relationship' } },
  { id: 'p9', option1: { text: 'ฉันสร้างเหตุผลที่รัดกุมเพื่อใช้ในการถกประเด็นสำคัญ', channel: 'logic' }, option2: { text: 'ฉันรวบรวมแรงสนับสนุนโดยการเข้าถึงบุคคลสำคัญ', channel: 'negotiation' } },
  { id: 'p10', option1: { text: 'ฉันทำความรู้จักกับผู้คนเป็นการส่วนตัว', channel: 'relationship' }, option2: { text: 'ฉันพยายามมากเพื่อให้ได้ "คนสำคัญ" มาสนับสนุนความคิดของฉัน', channel: 'negotiation' } },
  { id: 'p11', option1: { text: 'ฉันใช้อำนาจหน้าที่ในตำแหน่งของตนเอง', channel: 'authority' }, option2: { text: 'ฉันนำเสนอข้อมูล ตัวอย่างที่เคยเกิดขึ้น และชี้ให้เห็นข้อดีข้อเสีย', channel: 'logic' } },
  { id: 'p12', option1: { text: 'ฉันคบหาสมาคมกับคนที่ฉันต้องการชักจูงใจ', channel: 'relationship' }, option2: { text: 'ฉันแสดงให้เห็นว่าความคิดของฉันสอดคล้องกับแผนการโดยรวม', channel: 'vision' } },
  { id: 'p13', option1: { text: 'ฉันหาวิธีเจรจาต่อรองที่ทำให้ทุกคนสมหวัง', channel: 'influence' }, option2: { text: 'ฉันสร้างเครือข่ายที่กว้างขวางกับบุคคลในองค์กร', channel: 'negotiation' } },
  { id: 'p14', option1: { text: 'ฉันสร้างข้อพิสูจน์โดยใช้ข้อมูลและหลักฐาน', channel: 'logic' }, option2: { text: 'ฉันเน้นไปที่บุคคลหรือกลุ่มที่มีอิทธิพลด้านความคิด', channel: 'negotiation' } },
  { id: 'p15', option1: { text: 'ฉันถกประเด็นโดยให้เหตุผล', channel: 'logic' }, option2: { text: 'ฉันพยายามเข้าใจความรู้สึกของผู้อื่น', channel: 'relationship' } },
  { id: 'p16', option1: { text: 'ฉันใช้ตำแหน่ง/ฐานะ เพื่อให้ทำสิ่งต่างๆ ได้สำเร็จ', channel: 'authority' }, option2: { text: 'ฉันทำงานเบื้องหลังเพื่อให้ได้รับการสนับสนุน', channel: 'negotiation' } },
  { id: 'p17', option1: { text: 'ฉันอาศัยความสัมพันธ์เพื่อให้บรรลุเป้าหมาย', channel: 'relationship' }, option2: { text: 'บางครั้งฉันก็เรียกร้องมากกว่าที่ฉันคาดว่าจะได้รับ', channel: 'influence' } },
  { id: 'p18', option1: { text: 'ฉันทำสิ่งต่างๆ สำเร็จอย่างมีประสิทธิภาพโดยอาศัยอำนาจหน้าที่ของตนเอง', channel: 'authority' }, option2: { text: 'ฉันสร้างแรงบันดาลใจให้ผู้อื่นรู้สึกกระตือรือร้นเหมือนฉัน', channel: 'vision' } },
  { id: 'p19', option1: { text: 'ฉันนำเสนอข้อมูลที่ปราศจากอคติเพื่อทำให้ผู้อื่นเห็นด้วย', channel: 'logic' }, option2: { text: 'ฉันเตือนให้ผู้คนนึกถึงเป้าหมายที่แท้จริงขององค์กร', channel: 'vision' } },
  { id: 'p20', option1: { text: 'ฉันชนะใจเพื่อนและมีอิทธิพลต่อความคิดเห็นของผู้อื่น', channel: 'relationship' }, option2: { text: 'เป้าหมายของฉันคือผู้มีอำนาจในการตัดสินใจ', channel: 'negotiation' } },
  { id: 'p21', option1: { text: 'ฉันอาศัยอำนาจทุกอย่างที่ฉันมี', channel: 'authority' }, option2: { text: 'ฉันหาข้อยุติที่เป็นกลางเมื่อเกิดความขัดแย้ง', channel: 'influence' } },
  { id: 'p22', option1: { text: 'ฉันถกประเด็นโดยปราศจากอคติ', channel: 'logic' }, option2: { text: 'ฉันเจรจาต่อรองเพื่อให้ทุกฝ่ายสมหวัง', channel: 'negotiation' } },
  { id: 'p23', option1: { text: 'ฉันใช้สิ่งจูงใจเพื่อให้ได้รับการสนับสนุน', channel: 'influence' }, option2: { text: 'ฉันสร้างแรงผลักดันโดยรวบรวมความร่วมมือจากบุคคลหรือกลุ่มคนสำคัญ', channel: 'negotiation' } },
  { id: 'p24', option1: { text: 'ฉันใช้อำนาจที่มาจากตำแหน่งของตนเอง', channel: 'authority' }, option2: { text: 'ฉันวาดภาพอนาคตให้ผู้คนตื่นเต้น', channel: 'vision' } },
  { id: 'p25', option1: { text: 'ฉันใช้ข้อมูลและเหตุผลในการถกประเด็น', channel: 'logic' }, option2: { text: 'ฉันเน้นจุดประสงค์ร่วมกัน', channel: 'vision' } },
  { id: 'p26', option1: { text: 'ฉันนำเสนอแนวคิดโดยใช้เป้าหมายขององค์กร', channel: 'vision' }, option2: { text: 'ฉันใช้เวลาปรึกษาบุคคลสำคัญ', channel: 'negotiation' } },
  { id: 'p27', option1: { text: 'ฉันอาศัยตำแหน่งทางการในการทำสิ่งต่างๆ ให้สำเร็จ', channel: 'authority' }, option2: { text: 'ฉันทำให้ผู้อื่นเห็นชัดว่าฉันสนใจความต้องการของเขา', channel: 'relationship' } },
  { id: 'p28', option1: { text: 'ฉันยอมอ่อนข้อและหวังให้คนอื่นทำเช่นเดียวกัน', channel: 'influence' }, option2: { text: 'ฉันเตือนให้ผู้อื่นเห็นว่าสิ่งที่ทำมีความสำคัญ', channel: 'vision' } },
  { id: 'p29', option1: { text: 'ฉันใช้อำนาจ', channel: 'authority' }, option2: { text: 'ฉันคำนึงถึงการเมืองในองค์กรและเดินเกมอย่างระมัดระวัง', channel: 'negotiation' } },
  { id: 'p30', option1: { text: 'ฉันสร้างไมตรีจิตและให้ความสำคัญกับความรู้สึกของคนอื่น', channel: 'relationship' }, option2: { text: 'ฉันเสนอข้อตกลงที่ดีกับทั้งสองฝ่าย', channel: 'influence' } },
];

export function getTotalPersuasionQuestionCount(): number {
  return PERSUASION_QUESTIONS.length;
}
