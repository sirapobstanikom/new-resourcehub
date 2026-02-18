
import { JourneyCategory, InnovationUpdate } from './types';

export const JOURNEY_DATA: JourneyCategory[] = [
  {
    id: 'strategic',
    title: 'Business & Strategic Tools',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    tools: [
      { 
        id: 'bmc', 
        name: 'Business Model Canvas (BMC)', 
        description: 'เครื่องมือที่ช่วยให้ธุรกิจวางแผนและออกแบบโมเดลธุรกิจผ่าน 9 องค์ประกอบหลัก',
        longDescription: 'Business Model Canvas (BMC) เป็นเครื่องมือที่ช่วยให้ธุรกิจวางแผนและออกแบบโมเดลธุรกิจของตนเองผ่าน 9 องค์ประกอบหลัก โดยช่วยให้เห็นภาพรวมของธุรกิจได้ง่ายขึ้น และสามารถปรับปรุงหรือพัฒนาให้เหมาะสมกับตลาดและลูกค้าได้อย่างรวดเร็ว',
        usageInstructions: 'วิธีใช้งาน: เขียนรายละเอียด (ไอเดีย) ธุรกิจลงไปในองค์ประกอบทั้ง 9 ช่องของ BMC',
        blocks: [
          { title: 'Customer Segments', detail: 'ระบุว่าธุรกิจของคุณให้บริการใคร? ใครคือลูกค้าหลัก' },
          { title: 'Value Propositions', detail: 'ธุรกิจของคุณให้คุณค่าอะไรกับลูกค้า? คุณแก้ปัญหาอย่างไร?' },
          { title: 'Channels', detail: 'ลูกค้าเข้าถึงสินค้า/บริการผ่านช่องทางไหน?' },
          { title: 'Customer Relationships', detail: 'คุณจะสร้างและรักษาความสัมพันธ์กับลูกค้าอย่างไร?' },
          { title: 'Revenue Streams', detail: 'ธุรกิจของคุณสร้างรายได้จากอะไร?' },
          { title: 'Key Resources', detail: 'ทรัพยากรอะไรบ้างเพื่อให้ดําเนินงานได้?' },
          { title: 'Key Activities', detail: 'กิจกรรมหลักที่ต้องทําเพื่อให้ Value Proposition เกิดขึ้น' },
          { title: 'Key Partners', detail: 'ธุรกิจของคุณต้องร่วมมือกับใครบ้าง?' },
          { title: 'Cost Structure', detail: 'ต้นทุนหลักของธุรกิจมีอะไรบ้าง?' }
        ],
        source: 'Developed by Alexander Osterwalder (Business Model Generation, 2010).',
        additionalResources: [
          { label: 'Strategyzer - Business Model Canvas', url: 'https://www.strategyzer.com/canvas/business-model-canvas' },
          { label: 'Business Model Generation (Book)', url: 'https://www.strategyzer.com/books/business-model-generation' },
          { label: 'HBR: A Better Way to Think About Your Business Model', url: 'https://hbr.org/2013/05/a-better-way-to-think-about-your-business-model' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_b6fe4b1c03034eb19005093f693c7a10.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1000&auto=format&fit=crop'
      },
      { 
        id: 'gameplan', 
        name: 'Game Plan (Graphic GamePlan)', 
        description: 'เครื่องมือวางแผนเชิงกลยุทธ์แบบภาพที่ช่วยให้ทีมกําหนดเป้าหมายและคาดการณ์ความท้าทาย',
        longDescription: 'Game Plan เป็นเครื่องมือวางแผนเชิงกลยุทธ์แบบภาพ ที่ช่วยให้ทีมสามารถกําหนดเป้าหมาย วางแผนการดําเนินงาน และคาดการณ์ความท้าทายในการทํางาน โดยเน้นการจัดระเบียบแผนงานเป็นลําดับขั้นตอนที่ชัดเจน ช่วยสื่อสารแผนงานด้วย Visual Thinking',
        usageInstructions: 'วิธีใช้งาน: กำหนดเป้าหมายหลัก วางแผนทรัพยากร กำหนดภารกิจ และวิเคราะห์ปัจจัยความสำเร็จ',
        blocks: [
          { title: 'Target & Objectives', detail: 'ระบุ Primary Objectives (เป้าหมายหลัก) และ Other Objectives (เป้าหมายรอง) โดยใช้หลักการ SMART Goals (Specific, Measurable, Achievable, Relevant, Time-bound)' },
          { title: 'Team/Resources', detail: 'ระบุว่าทีมงานมีใครบ้างและทรัพยากรอะไรที่จําเป็นต้องใช้ในโครงการนี้' },
          { title: 'Stages/Tasks', detail: 'วางแผนเป็นลําดับขั้นตอนที่ต้องทําเพื่อให้บรรลุเป้าหมาย ใช้แผนภาพลูกศรเพื่อนําทางไปยังเป้าหมาย' },
          { title: 'Success Factors', detail: 'วิเคราะห์ว่าปัจจัยสําคัญอะไรบ้างที่จะทําให้แผนงานนี้ประสบความสําเร็จ' },
          { title: 'Challenges', detail: 'คาดการณ์อุปสรรคหรือปัญหาที่อาจเกิดขึ้น และเตรียมแนวทางแก้ไขไว้ล่วงหน้า' },
          { title: 'Review & Adjustments', detail: 'ประเมินความคืบหน้าเป็นระยะและปรับแผนตามความจําเป็นเพื่อให้บรรลุผลลัพธ์' }
        ],
        source: 'Game Plan ถูกพัฒนาโดย The Grove Consultants International ซึ่งเป็นองค์กรที่เชี่ยวชาญด้าน Visual Planning และ Graphic Facilitation',
        additionalResources: [
          { label: 'The Grove Consultants International', url: 'https://www.thegrove.com' },
          { label: 'Visual Meetings โดย David Sibbet', url: 'https://www.thegrove.com/visual-meetings' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_667b70c24167445391bc4e4edb8a681d.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=1000&auto=format&fit=crop'
      },
      {
        id: 'product-strategy',
        name: 'Product Strategy Template',
        description: 'Product Strategy Canvas เป็นเครื่องมือช่วยวางแผนกลยุทธ์ผลิตภัณฑ์ โดยช่วยให้ทีมสามารถกําหนดเป้าหมาย วิเคราะห์ปัญหา ระบุโอกาส และตัดสินใจเกี่ยวกับผลิตภัณฑ์ในเชิงกลยุทธ์',
        longDescription: 'Product Strategy Canvas เป็นเครื่องมือช่วยวางแผนกลยุทธ์ผลิตภัณฑ์ โดยช่วยให้ทีมสามารถกําหนดเป้าหมาย วิเคราะห์ปัญหา ระบุโอกาส และตัดสินใจเกี่ยวกับผลิตภัณฑ์ในเชิงกลยุทธ์ มุ่งเน้นการพัฒนาผลิตภัณฑ์โดยใช้ข้อมูล วิเคราะห์ตลาด และเชื่อมโยงกลยุทธ์ผลิตภัณฑ์กับเป้าหมายทางธุรกิจ',
        usageInstructions: 'การใช้งาน Product Strategy Canvas แบ่งเป็น 5 ส่วนหลัก: Diagnosis, Goal Setting, Decisions/Hypotheses, Actions และ Metrics',
        blocks: [
          { title: 'Diagnosis', detail: 'วิเคราะห์ผลิตภัณฑ์และตลาด / ทํา Product Health Check และวิเคราะห์ข้อมูลลูกค้า / ศึกษาคู่แข่งและวิเคราะห์ Value Chain' },
          { title: 'Goal Setting', detail: 'ระบุว่าต้องการให้ผลิตภัณฑ์ไปถึงจุดไหน / ตั้งเป้าหมายที่เชื่อมโยงกับกลยุทธ์ธุรกิจ' },
          { title: 'Decisions / Hypotheses', detail: 'Value: คุณค่าที่จะสร้าง | Audience: กลุ่มเป้าหมาย | Differentiation: ความแตกต่าง | Monetization: แผนการสร้างรายได้' },
          { title: 'Actions', detail: 'กําหนดขั้นตอนการดำเนินงานและทีมที่รับผิดชอบหลักเพื่อให้เป็นไปตามกลยุทธ์' },
          { title: 'Metrics', detail: 'ระบุ KPI เช่น รายได้, อัตราการเติบโต (Growth Rate), ความพึงพอใจลูกค้า (NPS/CSAT)' }
        ],
        source: 'ที่มา: ได้รับแรงบันดาลใจจาก Business Model Canvas (โดย Alexander Osterwalder) และแนวคิด Lean Startup ของ Eric Ries',
        additionalResources: [
          { label: 'The Lean Startup โดย Eric Ries', url: 'http://theleanstartup.com/' },
          { label: 'Inspired โดย Marty Cagan', url: 'https://www.svpg.com/inspired-how-to-create-products-customers-love/' },
          { label: 'Business Model Generation', url: 'https://www.strategyzer.com/library/business-model-generation' },
          { label: 'Department of Product', url: 'https://www.departmentofproduct.com/product-strategy' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_abec31fae3f24d0ebbef30d162c44c1e.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&auto=format&fit=crop'
      }
    ]
  },
  {
    id: 'innovation',
    title: 'Innovation & Creativity Tools',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop',
    tools: [
      { 
        id: 'innovation-opportunities-canvas', 
        name: 'Innovation Opportunities Canvas', 
        description: 'เครื่องมือที่ช่วยให้ทีมวิเคราะห์โอกาสในการสร้างนวัตกรรม โดยพิจารณาจากปัจจัยทั้งภายนอกและภายในองค์กร',
        longDescription: 'Innovation Opportunities Canvas เป็นเครื่องมือที่ช่วยให้ทีมสามารถ วิเคราะห์โอกาสในการสร้างนวัตกรรม โดยพิจารณาจากปัจจัยทั้งภายนอกและภายในองค์กร ซึ่งช่วยให้ระบุแนวทางที่สามารถสร้างคุณค่าใหม่ให้กับตลาดและองค์กรได้',
        usageInstructions: 'วิธีใช้งาน: วิเคราะห์ปัจจัย Mega Trends, Technology Trends, Social Problems, Strategy, Strengths และ Industry Problems เพื่อหาช่องว่างในการสังเคราะห์นวัตกรรมใหม่',
        blocks: [
          { title: 'Mega Trends/SDGs', detail: 'วิเคราะห์แนวโน้มระดับมหภาค เช่น การเปลี่ยนแปลงสภาพภูมิอากาศ, ความต้องการพลังงานสะอาด, การเติบโตของ AI' },
          { title: 'Sustainable Tech Trends', detail: 'ศึกษาเทคโนโลยีใหม่ๆ เช่น พลังงานหมุนเวียน, Blockchain, AI, Internet of Things (IoT)' },
          { title: 'Market/Social Problems', detail: 'วิเคราะห์ความต้องการของผู้บริโภค ปัญหาสังคม หรือพฤติกรรมที่เปลี่ยนแปลง' },
          { title: 'Context & Strategy', detail: 'ศึกษาทิศทางขององค์กรและอุตสาหกรรม เพื่อให้แน่ใจว่าแนวคิดนวัตกรรมสอดคล้องกับเป้าหมายธุรกิจ' },
          { title: 'Strengths & Advantages', detail: 'วิเคราะห์จุดแข็ง เช่น ทรัพยากร บุคลากร ความสามารถทางเทคโนโลยี เพื่อใช้เป็นฐานในการสร้างนวัตกรรม' },
          { title: 'Industry/Org. Problems', detail: 'ระบุ Pain Points ที่มีอยู่ในอุตสาหกรรมหรือองค์กรที่อาจเป็นโอกาสในการแก้ปัญหาด้วยนวัตกรรม' },
          { title: 'Synthesis & Opportunities', detail: 'นำข้อมูลจากทุกส่วนมาสังเคราะห์เป็นแนวคิดใหม่และจัดลำดับความสำคัญของโอกาส' }
        ],
        source: 'ที่มา: Innovation Opportunities Canvas ได้รับแรงบันดาลใจจาก Business Model Canvas (Alexander Osterwalder) และแนวคิด Design Thinking (IDEO)',
        additionalResources: [
          { label: 'Business Model Generation', url: 'https://www.strategyzer.com/books/business-model-generation' },
          { label: 'Design Thinking โดย IDEO', url: 'https://designthinking.ideo.com/' },
          { label: 'The Innovator’s DNA โดย Clayton Christensen', url: 'https://hbr.org/2009/12/the-innovators-dna' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_94e03697547144bb92fd5644fd31f0f7.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1454165833767-027ffea9e77b?q=80&w=1000&auto=format&fit=crop'
      },
      { 
        id: 'scamper', 
        name: 'SCAMPER Template', 
        description: 'SCAMPER เป็นเทคนิคที่ช่วยกระตุ้นความคิดสร้างสรรค์และการคิดเชิงนวัตกรรม โดยใช้ 7 คําถามหลัก',
        longDescription: 'SCAMPER เป็นเทคนิคที่ช่วยกระตุ้นความคิดสร้างสรรค์และการคิดเชิงนวัตกรรม โดยใช้ 7 คําถามหลัก เพื่อช่วยให้สามารถคิดหาวิธีการพัฒนาหรือปรับปรุงผลิตภัณฑ์ บริการ หรือกระบวนการทํางานได้อย่างมีประสิทธิภาพ',
        usageInstructions: 'วิธีใช้งาน: เลือกหัวข้อที่ต้องการพัฒนา และใช้คําถาม SCAMPER (S-C-A-M-P-E-R) เพื่อนําไปสู่ไอเดียใหม่ บันทึกและสังเคราะห์ไอเดียที่มีศักยภาพ',
        blocks: [
          { title: 'S - Substitute', detail: 'ทดแทน: มีอะไรที่สามารถใช้แทนกันได้? (วัสดุ, บุคลากร, กระบวนการ)' },
          { title: 'C - Combine', detail: 'รวมกัน: สามารถรวมสิ่งต่าง ๆ เข้าด้วยกันเพื่อให้ดีขึ้นได้หรือไม่?' },
          { title: 'A - Adapt', detail: 'ปรับใช้: มีอะไรที่สามารถดัดแปลงเพื่อให้ใช้ในบริบทใหม่ได้?' },
          { title: 'M - Modify', detail: 'เปลี่ยนแปลง/ขยาย: สามารถเพิ่มขนาด ปรับสี หรือเปลี่ยนลักษณะบางอย่างเพื่อให้ดีขึ้น?' },
          { title: 'P - Put to Another Use', detail: 'ใช้ในด้านอื่น: มีวิธีอื่นที่สามารถนําไปใช้ได้อีกหรือไม่?' },
          { title: 'E - Eliminate', detail: 'ตัดออก: มีสิ่งใดที่สามารถลบออกเพื่อลดความซับซ้อนและเพิ่มประสิทธิภาพ?' },
          { title: 'R - Reverse', detail: 'กลับด้าน/สลับลําดับ: สามารถเปลี่ยนลําดับหรือมุมมองเพื่อให้ได้ผลลัพธ์ที่ดีขึ้น?' }
        ],
        source: 'ที่มา: พัฒนาโดย Bob Eberle ในปี 1971 โดยต่อยอดจากแนวคิดของ Alex Osborn ผู้คิดค้น Brainstorming',
        additionalResources: [
          { label: 'SCAMPER โดย Bob Eberle', url: 'https://www.amazon.com/SCAMPER-Games-Imagination-Development-Eberle/dp/1593630121' },
          { label: 'Applied Imagination โดย Alex Osborn', url: 'https://www.amazon.com/Applied-Imagination-Alex-Osborn/dp/1614275003' },
          { label: 'IDEO Design Thinking', url: 'https://designthinking.ideo.com/' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_3f081a1d4ebe44d9a291dad177eb54a0.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'
      },
      {
        id: 'how-now-wow-matrix',
        name: 'How-Now-Wow Matrix',
        description: 'เครื่องมือช่วยคัดเลือกไอเดียหลังจากกระบวนการระดมสมอง โดยจัดกลุ่มไอเดียตามความคิดสร้างสรรค์และความสามารถในการนําไปปฏิบัติ',
        longDescription: 'How-Now-Wow Matrix เป็น เครื่องมือช่วยคัดเลือกไอเดีย หลังจากกระบวนการระดมสมอง โดยจัดกลุ่มไอเดียตาม ความคิดสร้างสรรค์ (Originality) และ ความสามารถในการนําไปปฏิบัติ (Feasibility) เป้าหมายของเครื่องมือนี้คือช่วยให้ทีมสามารถ เลือกไอเดียที่ดีที่สุด สําหรับการพัฒนาโครงการ นวัตกรรม หรือกลยุทธ์ทางธุรกิจ',
        usageInstructions: 'วิธีใช้งาน: สร้างตาราง 2x2 วัดระดับความคิดสร้างสรรค์ (แกน X) และความสามารถในการนําไปใช้จริง (แกน Y) จากนั้นคัดแยกไอเดียลงใน 3 กลุ่มหลัก คือ Now, How, และ Wow',
        blocks: [
          { title: 'Now (Blue)', detail: 'ไอเดียทั่วไป ที่นําไปใช้ได้ง่าย และเป็นที่รู้จักอยู่แล้ว (Low Originality, High Feasibility)' },
          { title: 'How (Yellow)', detail: 'ไอเดียใหม่ๆ ที่มีความสร้างสรรค์สูง แต่ยังนําไปใช้ไม่ได้ทันที (High Originality, Low Feasibility)' },
          { title: 'Wow (Green)', detail: 'ไอเดียที่สร้างสรรค์และ สามารถนําไปใช้ได้จริง (High Originality, High Feasibility)' },
          { title: 'Idea Selection', detail: 'วิเคราะห์ผล: ไอเดีย Wow มีศักยภาพสูงสุด, Now นําไปใช้ได้ทันที, How เก็บไว้สําหรับอนาคต' }
        ],
        source: 'ที่มา: How-Now-Wow Matrix เป็นส่วนหนึ่งของกระบวนการ Idea Selection ที่ใช้ในแนวคิด Creative Problem Solving (CPS) ซึ่งถูกพัฒนาโดย Alex Osborn ผู้บุกเบิกการระดมสมอง',
        additionalResources: [
          { label: 'Creative Problem Solving โดย Alex Osborn', url: 'https://www.amazon.com/Applied-Imagination-Principles-Procedures-Creative/dp/0930222718' },
          { label: 'SessionLab: How-Now-Wow Matrix', url: 'https://www.sessionlab.com/methods/how-now-wow-matrix' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/8f9517_e72ed88c4107433e96390b6999c13853.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=1000&auto=format&fit=crop'
      }
    ]
  },
  {
    id: 'empathy',
    title: 'Customer Empathy Tools',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop',
    tools: [
      { 
        id: 'cjm', 
        name: 'Customer Journey Map', 
        description: 'เครื่องมือที่ใช้ วิเคราะห์และทําความเข้าใจประสบการณ์ของลูกค้า ในการมีปฏิสัมพันธ์กับแบรนด์หรือผลิตภัณฑ์ของคุณ',
        longDescription: 'Customer Journey Map (CJM) เป็นเครื่องมือที่ใช้ วิเคราะห์และทําความเข้าใจประสบการณ์ของลูกค้า ในการมีปฏิสัมพันธ์กับแบรนด์หรือผลิตภัณฑ์ของคุณ ช่วยให้ทีมมองเห็นภาพรวมตั้งแต่เริ่มต้นจนจบกระบวนการ เพื่อระบุจุดที่สร้างความพึงพอใจและจุดที่ควรปรับปรุง',
        usageInstructions: 'วิธีใช้งาน: เริ่มจากระบุ Persona ลูกค้า, กำหนดขั้นตอน (Stages), บันทึกพฤติกรรม (Actions), วิเคราะห์ความคิดและความรู้สึก (Thinking & Feeling) และระบุโอกาสในการปรับปรุง',
        blocks: [
          { title: 'Persona & Stages', detail: 'ระบุกลุ่มเป้าหมาย (เช่น นักศึกษา, คนทำงาน) และกำหนดขั้นตอนหลัก (Awareness → Consideration → Purchase → Loyalty)' },
          { title: 'Customer Actions', detail: 'บันทึกสิ่งที่ลูกค้าทำในแต่ละขั้นตอน เช่น ค้นหาใน Google, อ่านรีวิว, เปรียบเทียบราคา, สมัครสมาชิก' },
          { title: 'Thinking & Feeling', detail: 'วิเคราะห์สิ่งที่ลูกค้าคิดและรู้สึก (ดีใจ, กังวล, สับสน) ในแต่ละจุดสัมผัส เพื่อหา Pain Points ของลูกค้า' },
          { title: 'Experience Analysis', detail: 'ประเมินระดับความพึงพอใจโดยรวมในแต่ละช่วง และระบุจุดวิกฤตที่ลูกค้ามีประสบการณ์ที่ไม่ดี' },
          { title: 'Improvement Opportunities', detail: 'วางแนวทางการแก้ไข Pain Points และเพิ่มคุณค่าในแต่ละจุด เพื่อสร้างประสบการณ์ที่ยอดเยี่ยม' }
        ],
        source: 'ที่มา: มีรากฐานมาจาก UX Design และ Service Design นิยมใช้ในองค์กรที่เน้น Customer-Centric Approach เช่น Amazon, Apple และ Airbnb',
        additionalResources: [
          { label: 'Mapping Experiences โดย Jim Kalbach', url: 'https://www.amazon.com/Mapping-Experiences-Complete-Creating-Blueprints/dp/1491923539' },
          { label: 'This is Service Design Thinking', url: 'https://www.thisisservicedesignthinking.com/' },
          { label: 'Nielsen Norman Group - CJM Guide', url: 'https://www.nngroup.com/articles/customer-journey-mapping-101/' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_6eebf8118b52418e889153fea283d628.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop'
      },
      {
        id: 'problem-statement',
        name: 'Problem Statement Template',
        description: 'เครื่องมือที่ช่วยให้ทีม นิยามปัญหาอย่างเป็นระบบ โดยใช้มุมมองของผู้ใช้งานหรือลูกค้า',
        longDescription: 'Problem Statement Template เป็นเครื่องมือที่ช่วยให้ทีม นิยามปัญหาอย่างเป็นระบบ โดยใช้มุมมองของผู้ใช้งานหรือลูกค้า ซึ่งช่วยให้เข้าใจความต้องการและอุปสรรคที่แท้จริง ช่วยให้การออกแบบโซลูชันตรงประเด็นและตอบโจทย์ผู้ใช้อย่างแท้จริง',
        usageInstructions: 'วิธีใช้งาน: วิเคราะห์และระบุตัวตนของผู้ใช้ (Who), สิ่งที่ต้องการทำ (What), อุปสรรค (Obstacle), สาเหตุ (Why) และความรู้สึก (Feeling)',
        blocks: [
          { title: 'ฉันคือ... (Who am I?)', detail: 'ระบุตัวตนของผู้ใช้ เช่น นักเรียน, คนทํางาน, นักเดินทาง ช่วยให้เข้าใจบริบทและมุมมองของผู้ใช้' },
          { title: 'ฉันพยายามจะ... (What am I trying to do?)', detail: 'อธิบายสิ่งที่ผู้ใช้ต้องการทําหรือบรรลุ เช่น "ฉันพยายามจะหาสินค้าออนไลน์ที่ดีที่สุด"' },
          { title: 'แต่... (What’s stopping me?)', detail: 'ระบุอุปสรรคที่ขัดขวาง เช่น "แต่ฉันไม่รู้ว่ารีวิวไหนน่าเชื่อถือ"' },
          { title: 'เพราะ... (Why does this problem exist?)', detail: 'ค้นหาสาเหตุที่แท้จริง เช่น "เพราะมีรีวิวปลอมจํานวนมาก"' },
          { title: 'ทําให้ฉันรู้สึก... (How does it make me feel?)', detail: 'อธิบายอารมณ์ของผู้ใช้ เช่น สับสน, หงุดหงิด, ไม่มั่นใจ' }
        ],
        source: 'ที่มา: ได้รับอิทธิพลจาก Empathy Mapping และ Human-Centered Design ถูกใช้งานโดยองค์กรชั้นนํา เช่น IDEO, Google Design Sprint และ Stanford d.school',
        additionalResources: [
          { label: 'Design Thinking โดย Jeanne Liedtka', url: 'https://www.amazon.com/Design-Thinking-Creating-Customer-Experiences/dp/0231173523' },
          { label: 'Stanford d.school: Design Thinking Bootleg', url: 'https://dschool.stanford.edu/resources/design-thinking-bootleg' },
          { label: 'Google Design Sprint', url: 'https://gv.com/sprint/' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_d1252f7913a34a05a36249f1a162e5b5.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1000&auto=format&fit=crop'
      },
      {
        id: 'empathy-map',
        name: 'Customer Empathy Map',
        description: 'เครื่องมือที่ช่วยให้ทีม เข้าใจมุมมองของลูกค้า อย่างลึกซึ้งโดยใช้กรอบแนวคิดเกี่ยวกับสิ่งที่ลูกค้า คิด, รู้สึก, พูด, ได้ยิน, มองเห็น, และสัมผัส',
        longDescription: 'Customer Empathy Map เป็นเครื่องมือที่ช่วยให้ทีม เข้าใจมุมมองของลูกค้า อย่างลึกซึ้งโดยใช้กรอบแนวคิดเกี่ยวกับสิ่งที่ลูกค้า คิด, รู้สึก, พูด, ได้ยิน, มองเห็น, และสัมผัส ช่วยให้ทีมมองข้ามสมมติฐานและเข้าถึงความต้องการที่แท้จริงของผู้ใช้',
        usageInstructions: 'วิธีใช้งาน: กําหนด Persona ลูกค้าเป้าหมาย และเติมข้อมูลใน 6 ส่วนหลัก (Think & Feel, See, Hear, Say & Do, Pain, Gain) เพื่อวิเคราะห์และสังเคราะห์อินไซต์',
        blocks: [
          { title: 'Think & Feel', detail: 'ลูกค้าคิดและรู้สึกอย่างไร? อะไรคือสิ่งที่ลูกค้าให้ความสําคัญ? ลูกค้ากังวลเรื่องอะไร? มีเป้าหมายอะไร?' },
          { title: 'See', detail: 'ลูกค้ามองเห็นอะไร? ลูกค้าพบเจอสภาพแวดล้อมแบบไหน? พวกเขาเห็นอะไรในตลาดหรือสังคมรอบตัว?' },
          { title: 'Hear', detail: 'ลูกค้าได้ยินอะไร? ลูกค้าได้รับอิทธิพลจากใคร? (เพื่อน, เจ้านาย, โซเชียลมีเดีย)' },
          { title: 'Say & Do', detail: 'ลูกค้าพูดและทําอะไร? พฤติกรรมของลูกค้าเป็นอย่างไร? พวกเขาแสดงออกอย่างไรต่อสาธารณะ?' },
          { title: 'Pain', detail: 'อะไรคือปัญหาของลูกค้า? ลูกค้ารู้สึกหงุดหงิดหรือผิดหวังเรื่องอะไร? อุปสรรคที่ขวางกั้นเป้าหมายคืออะไร?' },
          { title: 'Gain', detail: 'ลูกค้าหวังจะได้รับอะไร? ลูกค้าต้องการความสําเร็จแบบไหน? สิ่งที่จะสร้างความพึงพอใจอย่างแท้จริงคืออะไร?' }
        ],
        source: 'ที่มา: พัฒนาโดย Dave Gray จาก XPLANE ได้รับอิทธิพลจากแนวคิด Design Thinking และถูกนําไปใช้ในองค์กรชั้นนํา เช่น IDEO และ Stanford d.school',
        additionalResources: [
          { label: 'Gamestorming โดย Dave Gray', url: 'https://gamestorming.com/empathy-map/' },
          { label: 'Stanford d.school: Design Thinking Bootleg', url: 'https://dschool.stanford.edu/resources/design-thinking-bootleg' },
          { label: 'เว็บไซต์ XPLANE', url: 'https://xplane.com' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_5f49359141204d97a5ac5d7f016da0b1.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop'
      }
    ]
  },
  {
    id: 'execution',
    title: 'Execution & Impact Tools',
    image: 'https://images.unsplash.com/photo-1454165833767-027ffea9e77b?q=80&w=800&auto=format&fit=crop',
    tools: [
      {
        id: 'experiment-canvas',
        name: 'Experiment Canvas',
        description: 'เครื่องมือที่ช่วยให้ทีมสามารถออกแบบ การทดลองธุรกิจหรือผลิตภัณฑ์ ได้อย่างเป็นระบบ โดยมุ่งเน้นไปที่การทดสอบสมมติฐานสําคัญ',
        longDescription: 'Experiment Canvas เป็นเครื่องมือที่ช่วยให้ทีมสามารถออกแบบ การทดลองธุรกิจหรือผลิตภัณฑ์ ได้อย่างเป็นระบบ โดยมุ่งเน้นไปที่การทดสอบสมมติฐานสําคัญ (Critical Assumption) และช่วยให้ตัดสินใจได้ว่าควรเดินหน้าหรือปรับเปลี่ยนแผนอย่างไร ช่วยประหยัดเวลาและทรัพยากรโดยการพิสูจน์ไอเดียก่อนลงมือทำจริง',
        usageInstructions: 'วิธีใช้งาน: เขียนรายละเอียดการเตรียมตัวการทดลอง และผลการทดลองลงใน Canvas ตามลำดับขั้นตอนตั้งแต่การระบุสมมติฐานไปจนถึงข้อสรุป',
        blocks: [
          { title: 'Critical Assumption', detail: 'ระบุสิ่งที่คุณต้องพิสูจน์ว่าเป็นจริง เช่น "ลูกค้าต้องการจ่ายเงินเพื่อใช้ฟีเจอร์นี้"' },
          { title: 'Measurable Outcome & Timeframe', detail: 'ระบุสิ่งที่ต้องการวัด (เช่น อัตราการสมัครสมาชิก) และกําหนดระยะเวลาที่ใช้ (เช่น 1 สัปดาห์)' },
          { title: 'Experiment Plan (MVP)', detail: 'กําหนดวิธีการที่จะใช้ทดสอบ เช่น การปล่อยโฆษณา, A/B Testing, การสัมภาษณ์ลูกค้า หรือ Landing Page' },
          { title: 'Preparation', detail: 'สิ่งที่ต้องเตรียมก่อนการทดลอง เช่น เครื่องมือที่ต้องใช้, ทีมงานผู้รับผิดชอบ, และงบประมาณ' },
          { title: 'Results & Insights', detail: 'บันทึกผลลัพธ์ (เช่น จํานวนคลิก) และวิเคราะห์ว่าผลลัพธ์นั้นบ่งบอกอะไร (เช่น ลูกค้าสนใจแต่ไม่ยอมจ่ายเงิน)' },
          { title: 'Conclusion', detail: '✔ Validated: สมมติฐานถูก | ❌ Invalidated: สมมติฐานผิด | ❓ Inconclusive: ผลยังไม่ชัดเจน' },
          { title: 'Next Step', detail: 'วางแผนการดําเนินงานต่อไป ว่าจะพัฒนาต่อ ปรับเปลี่ยนแนวทาง หรือทดสอบเพิ่มเติมอย่างไร' }
        ],
        source: 'ที่มา: Experiment Canvas ได้รับแรงบันดาลใจจากแนวคิด Lean Startup โดย Eric Ries และกลยุทธ์การทดสอบสมมติฐานจาก Strategyzer',
        additionalResources: [
          { label: 'The Lean Startup โดย Eric Ries', url: 'http://theleanstartup.com/' },
          { label: 'Testing Business Ideas - David J. Bland', url: 'https://www.strategyzer.com/books/testing-business-ideas' },
          { label: 'เว็บไซต์ Strategyzer', url: 'https://www.strategyzer.com' }
        ],
        templateUrl: 'https://www.minddojo.co.th/_files/ugd/a57aeb_bf71ec294b9f419c9a9f2544be1fb296.pdf',
        exampleImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop'
      }
    ]
  }
];

export const UPDATES_DATA: InnovationUpdate[] = [
  {
    id: 'update-1',
    title: 'Polaris Aerospace: The Future of Aerospike Technology',
    description: 'Despite setbacks, Polaris is pushing forward with MIRA II and III prototypes, aiming to revolutionize space travel costs.',
    image: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'update-2',
    title: 'Human vs AI: The Imagination Challenge',
    description: 'Lunchables launches "Head of Imagination" contest for kids, betting that human creativity still outshines AI in raw originality.',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1200&auto=format&fit=crop'
  }
];
