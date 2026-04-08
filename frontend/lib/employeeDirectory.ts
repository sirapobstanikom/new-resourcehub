/** รายชื่อพนักงานอ้างอิง (เช่น ยื่นลา) — ใช้ในแถบข้างแอดมิน */

export const EMPLOYEE_DEPT_IDS = ['it', 'trainer', 'ceo', 'sales', 'production', 'admin'] as const;
export type EmployeeDeptId = (typeof EMPLOYEE_DEPT_IDS)[number];

export const EMPLOYEE_DEPT_LABELS: Record<EmployeeDeptId, string> = {
  it: 'IT',
  trainer: 'วิทยากร',
  ceo: 'CEO',
  sales: 'Sales',
  production: 'Production',
  admin: 'Admin',
};

// หมายเหตุ: ยังไม่มีข้อมูลว่าแต่ละคนอยู่แผนกไหนแน่
// ดังนั้นใส่ให้ทั้งหมดเป็นแผนก `admin` ก่อน แล้วค่อยแก้ mapping ตามที่คุณแจ้ง
export const EMPLOYEES: Array<{ name: string; phone: string; dept: EmployeeDeptId }> = [
  { name: 'นาย สิรภพ สตานิคม', phone: '0957980871', dept: 'it' },
  { name: 'นาย ศราวุธ ปื่นทอง', phone: '0955188408', dept: 'it' },
  { name: 'นาย ธนโชติ มีกังวาล', phone: '0873648269', dept: 'trainer' },
  { name: 'นายวีรวัฒน์ พากเพียรกิจ', phone: '0951959989', dept: 'trainer' },
  { name: 'นายอุประจิตร รวมทรัพย์', phone: '0909618529', dept: 'trainer' },
  { name: 'นายพีรวิชญ์ พูลขวัญ', phone: '0968781140', dept: 'production' },
  { name: 'นางสาวนิรชา ไม้งาม', phone: '0910966938', dept: 'sales' },
  { name: 'นาวสาวมนิดา พิมกา', phone: '085-095-6965', dept: 'admin' },
  { name: 'Mr. Songpathara Snidvongs', phone: '0832744456', dept: 'ceo' },
  { name: 'นายบรรพต บุญธรรม', phone: '0890399444', dept: 'trainer' },
  { name: 'นางสาวสิริมา เงินอนันต์', phone: '0889647826', dept: 'sales' },
  { name: 'คุณนาย ชนิสรา เมฆประดับ', phone: '0971877766', dept: 'sales' },
  { name: 'Rachaphak Trainontikorn', phone: '0956496963', dept: 'sales' },
  { name: 'นางสาวชิษณุชา เศรษฐธัญกิจ', phone: '0955914958', dept: 'production' },
  { name: 'นางสาวธรินทร์ญา กรแวววงศ์เจริญ', phone: '0914088708', dept: 'admin' },
  { name: 'นางมาสเมษา สนิทวงศ์ ณ อยุธยา', phone: '0894479878', dept: 'ceo' },
  { name: 'นางสาว พริมพิชา ธัญญเจริญ', phone: '0802357570', dept: 'it' },
  { name: 'ว่าที่ ร.ต.จีรวัฒน์ เยาวนิช', phone: '0922720923', dept: 'trainer' },
  { name: 'นางสาวอรจิรา จูงเจริญวงศ์', phone: '0944565599', dept: 'trainer' },
];
