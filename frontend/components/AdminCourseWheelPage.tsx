import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

type Item = { name: string; description: string; courseUrl?: string };
type WheelCategory = {
  id: string;
  name: string;
  intermediateName: string;
  color: 'black' | 'yellow';
  description: string;
  topics: Item[];
  subCategories: Item[];
};
type Selection = { type: string | null; data: Item | WheelCategory | null; quadrantId: string | null };

const WHEEL_DATA: WheelCategory[] = [
  { id: 'resilient-leadership', name: 'Resilient Leadership', intermediateName: 'Emotional Intelligence', color: 'yellow', description: 'Developing the ability to lead effectively through change and uncertainty.',
    topics: [
      { name: 'People Intelligence with MBTI/DISC', description: 'ในปัจจุบันนี้หลายองค์กรกำลังประสบปัญหาการเปลี่ยนแปลงที่ไม่ประสบผลสำเร็จเท่าที่ควร', courseUrl: 'https://www.minddojo.co.th/family-course/people-intelligence' },
      { name: 'Emotional Intelligence & Mindfulness', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาความฉลาดทางอารมณ์', courseUrl: 'https://www.minddojo.co.th/family-course/emotional-intelligence' },
      { name: 'Conflict Resolution', description: 'มุ่งเน้นที่การเรียนรู้วิธีการจัดการและแก้ไขข้อขัดแย้งในที่ทำงานหรือในชีวิตประจำวัน', courseUrl: 'https://www.minddojo.co.th/family-course/conflict-resolution' }
    ],
    subCategories: [
      { name: 'Leadership Challenge', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะสำคัญสำหรับการเป็นผู้นำที่มีประสิทธิภาพ' , courseUrl: 'https://www.minddojo.co.th/family-course/leadership-challenge'},
      { name: 'Resilience Leadership', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะการขายและการรับมือกับการถูกปฏิเสธ', courseUrl: 'https://www.minddojo.co.th/workshop?course=Resilience Leadership' },
      { name: 'High Performing Team', description: 'มุ่งเน้นที่การพัฒนาทีมให้มีประสิทธิภาพสูงสุดและทำงานร่วมกันได้อย่างมีประสิทธิผล' , courseUrl: 'https://www.minddojo.co.th/family-course/unleashing-high-performing-team'}
    ]
  },
  { id: 'succeeding-stakeholders', name: 'Succeeding with Stakeholder', intermediateName: 'Collaboration and Communication', color: 'black', description: 'Mastering the art of influence and relationship management with key stakeholders.',
    topics: [
      { name: 'Effective and Empathetic Communication', description: 'ปลดปล่อยศักยภาพความคิดสร้างสรรค์ สู่พลังขับเคลื่อนการสร้างนวัตกรรม', courseUrl: 'https://www.minddojo.co.th/workshop?course=Effective and Empathetic Communication' },
      { name: 'Leadership Essential Skills', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะสำคัญสำหรับการเป็นผู้นำที่มีประสิทธิภาพ', courseUrl: 'https://www.minddojo.co.th/workshop?course=Leadership Essential Skills' },
      { name: 'Negotiation & Persuasion Skills', description: 'มุ่งเน้นการพัฒนาทักษะการชักจูงและการเจรจาต่อรอง', courseUrl: 'https://www.minddojo.co.th/family-course/negotiation-%26-persuasion-for-sales-pitching' }
    ],
    subCategories: [
      { name: 'Stakeholder Management & Influence', description: 'เพื่อให้โครงการของคุณประสบความสำเร็จ สิ่งสำคัญคือต้องตระหนักว่าผู้มีส่วนได้ส่วนเสียแต่ละคนมีมุมมองที่แตกต่างกัน' , courseUrl: 'https://www.minddojo.co.th/family-course/stakeholder-management'},
      { name: 'Data Storytelling with Confidence', description: 'เพื่อการสื่อสารข้อมูลและการวิเคราะห์ข้อมูลอย่างมีประสิทธิภาพ' , courseUrl: 'https://www.minddojo.co.th/family-course/data-storytelling'},
      { name: 'Sustainability in Action', description: 'เป็นการอบรมที่มุ่งเน้นการจัดการการเปลี่ยนแปลงภายในองค์กรเพื่อสนับสนุนความยั่งยืน' , courseUrl: 'https://www.minddojo.co.th/workshop?course=Sustainability in Action'}
    ]
  },
  { id: 'innovation-transformation', name: 'Innovation & Transformation', intermediateName: 'Learning and Growth', color: 'yellow', description: 'Driving growth through innovative practices and organizational transformation.',
    topics: [
      { name: 'Coaching and Mentoring', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะในการโค้ชและการให้คำปรึกษาแก่พนักงานหรือทีมงาน' , courseUrl: 'https://www.minddojo.co.th/family-course/performance-coaching'},
      { name: 'Psychological Safety in Practice', description: 'มุ่งเน้นที่การสร้างและส่งเสริมวัฒนธรรมความปลอดภัยทางจิตใจในที่ทำงาน', courseUrl: 'https://www.minddojo.co.th/family-course/psychological-safety-culture' },
      { name: 'Train the Professional Trainer', description: 'หลักสูตรเทรนเนอร์ในองค์กร พัฒนาทักษะการออกแบบและถ่ายทอดการเรียนรู้ พร้อม AI' , courseUrl: 'https://www.minddojo.co.th/family-course/train-the-trainer-certification-program'}
    ],
    subCategories: [
      { name: 'Agile Project Management', description: 'การบริหารจัดการโครงการแบบ Agile เพื่อเห็นความเสี่ยงและปรับตัวได้เร็ว' , courseUrl: 'https://www.minddojo.co.th/family-course/real-innovation-through-agile-project'},
      { name: 'Change Maker', description: 'การเปลี่ยนแปลงองค์กรด้วยการเปลี่ยนความคิด พฤติกรรม และการลงมือทำ' , courseUrl: 'https://www.minddojo.co.th/change-maker'},
      { name: 'Practical Design Thinking', description: 'เน้นการพัฒนาทักษะและวิธีคิดเพื่อการแก้ไขปัญหาและการสร้างนวัตกรรม' , courseUrl: 'https://www.minddojo.co.th/family-course/practical-innovation'}
    ]
  },
  { id: 'strategic-value', name: 'Strategic Value Creation', intermediateName: 'Creativity and Problem Solving', color: 'black', description: 'Focuses on creating long-term value through strategic thinking and foresight.',
    topics: [
      { name: 'Critical Thinking', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะการคิดเชิงวิพากษ์ ซึ่งเป็นทักษะที่ช่วยให้ผู้เข้าอบรมสามารถวิเคราะห์และประเมินข้อมูล สถานการณ์ และการตัดสินใจต่างๆ อย่างมีเหตุผลและเป็นระบบ', courseUrl: 'https://www.minddojo.co.th/workshop?course=Critical Thinking' },
      { name: 'Creative Thinking and Ideation', description: 'Thinking outside the box to find new solutions.', courseUrl: 'https://www.minddojo.co.th/workshop?course=Creative Thinking and Ideation' },
      { name: 'Creative Problem Solving & Decision Making', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะในการแก้ปัญหาและการตัดสินใจอย่างมีประสิทธิภาพ' , courseUrl: 'https://www.minddojo.co.th/workshop?course=Creative Thinking and Ideation'}
    ],
    subCategories: [
      { name: 'Strategic Foresight', description: 'เป็นหลักสูตรที่เน้นการพัฒนาทักษะและความรู้ในการพยากรณ์อนาคตและการวางแผนกลยุทธ์ผ่านการสร้างฉากทัศน์ต่างๆ', courseUrl: 'https://www.minddojo.co.th/family-course/strategic-foresight' },
      { name: 'Practical Strategy', description: 'เป็นการอบรมที่มุ่งเน้นการพัฒนาทักษะและความรู้ในการวิเคราะห์เชิงกลยุทธ์', courseUrl: 'https://www.minddojo.co.th/family-course/practical-strategies' },
      { name: 'Aligning Your Strategy', description: 'เป็นการอบรมที่มุ่งเน้นการปรับให้กลยุทธ์ต่าง ๆ ขององค์กรสอดคล้องกันอย่างเป็นระบบ' , courseUrl: 'https://www.minddojo.co.th/family-course/aligning-your-strategies'}
    ]
  }
];

const FOUNDATION_SKILLS = {
  title: 'Foundation Skills',
  subtitle: 'AI for Everyone',
  bullets: [
    { 
      name: 'AI for Everyone: How to Work Smarter with AI Tools',
      description: 'ใช้ AI เป็นผู้ช่วยส่วนตัวในการทํางานประจําวัน ลดเวลาการทํางานซํ้า ๆ ได้อย่างน้อย 30-50% วิเคราะห์ สรุป และสื่อสารข้อมูลได้ชัดเจนขึ้น ทํางานได้เร็วขึ้น โดยไม่ต้องมีพื้นฐาน',
      courseUrl: 'https://www.minddojo.co.th/family-course/-ai-for-everyone%3A-how-to-work-smarter-with-ai-tools'
    },
    {
      name: 'AI Powered Data Analytics & Visualization',
      description: 'ใช้ AI วิเคราะห์ข้อมูลจาก Excel/CSV ค้นหา Insight ที่สำคัญ และสื่อสารผลลัพธ์ผ่าน Visualization ที่เข้าใจง่าย เพื่อช่วยให้ตัดสินใจทางธุรกิจได้แม่นยำขึ้น',
      courseUrl: 'https://www.minddojo.co.th/family-course/ai-powered-data-analytics-%26-visualization'
    },
    {
      name: 'Analyst Tools: Scalable Analytics with Power BI',
      description: 'พัฒนาทักษะ Power BI ตั้งแต่การเตรียมข้อมูล สร้าง Data Model เขียน DAX ไปจนถึงการสร้าง Dashboard แบบ Interactive เพื่อการวิเคราะห์ข้อมูลระดับองค์กร',
      courseUrl: 'https://www.minddojo.co.th/family-course/analyst-tools%3A-scalable-analytics-with-power-bi'
    },

  ]
};

const WHEEL_COLORS = {
  // Outer Arcs
  yellowOuter: '#F9B732',
  blueOuter: '#121E30',
  
  // Inner Quadrants
  creamInner: '#FEF4E5',
  greyInner: '#EAEFF5',
  
  // Center
  centerBg: '#0A0A0A',
  centerYellow: '#F9B732',
  centerWhite: '#FFFFFF',
};

const ICONS = {
  Info: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  RotateCcw: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  ChevronLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Target: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Users: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  Zap: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Lightbulb: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/></svg>
};

const LINE_GAP = 22;

function splitTextMultiLine(text: string): string[] | null {
  const norm = text.trim();
  if (norm === 'Innovation & Transformation' || norm === 'Innovation Transformation') {
    return ['TRANSFORMATION', 'INNOVATION'];
  }
  if (norm === 'Strategic Value Creation') {
    return ['STRATEGIC VALUE', 'CREATION'];
  }
  if (norm === 'Succeeding with Stakeholder' || norm === 'Succeeding with Stakeholders') {
    return ['STAKEHOLDER', 'SUCCEEDING WITH'];
  }
  if (norm === 'Resilient Leadership') {
    return ['RESILIENT', 'LEADERSHIP'];
  }
  return null;
}

const getInnerQuadrantTextLines = (id: string): string[] => {
  switch (id) {
    case 'innovation-transformation':
      return ['LEARNING', '& GROWTH'];
    case 'strategic-value':
      return ['CREATIVITY', 'AND', 'PROBLEM-SOLVING'];
    case 'succeeding-stakeholders':
      return ['COLLABORATION', 'AND', 'COMMUNICATION'];
    case 'resilient-leadership':
      return ['EMOTIONAL', 'INTELLIGENCE'];
    default:
      return [];
  }
};

const getLabelCoords = (midAngle: number, radius: number) => {
  const rad = (midAngle - 90) * (Math.PI / 180);
  return {
    x: 500 + radius * Math.cos(rad),
    y: 500 + radius * Math.sin(rad),
  };
};

const MultilineText = ({
  x,
  y,
  lines,
  color,
  fontSize = 13,
  lineHeight = 18,
}: {
  x: number;
  y: number;
  lines: string[];
  color: string;
  fontSize?: number;
  lineHeight?: number;
}) => {
  const halfLen = (lines.length - 1) / 2;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {lines.map((line, idx) => {
        const dy = (idx - halfLen) * lineHeight;
        return (
          <text
            key={idx}
            x={x}
            y={y + dy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 900,
              fontFamily: '"Prompt", sans-serif',
              letterSpacing: '0.04em',
            }}
          >
            {line}
          </text>
        );
      })}
    </g>
  );
};

const ArcText = memo(({
  id,
  text,
  radius,
  startAngle,
  endAngle,
  color = 'currentColor',
  fontSize = '18px'
}: {
  id: string;
  text: string;
  radius: number;
  startAngle: number;
  endAngle: number;
  color?: string;
  fontSize?: string;
}) => {
  const midAngle = (startAngle + endAngle) / 2;
  const normalizedMidAngle = (midAngle + 360) % 360;
  const isUpsideDown = normalizedMidAngle > 95 && normalizedMidAngle < 265;

  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const makePath = (r: number) => {
    const x1 = 500 + r * Math.cos(startRad);
    const y1 = 500 + r * Math.sin(startRad);

    const x2 = 500 + r * Math.cos(endRad);
    const y2 = 500 + r * Math.sin(endRad);

    const normalPath = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
    const reversePath = `M ${x2} ${y2} A ${r} ${r} 0 0 0 ${x1} ${y1}`;

    return isUpsideDown ? reversePath : normalPath;
  };

  const lines = splitTextMultiLine(text);
  const totalLines = lines?.length || 1;

  const getCenteredRadius = (index: number) => {
    const relativeIndex = isUpsideDown ? (totalLines - 1 - index) : index;
    const offset = (relativeIndex - (totalLines - 1) / 2) * LINE_GAP;
    return radius - offset;
  };

  const orderedLines = lines && isUpsideDown ? [...lines].reverse() : lines;
  const textOffset = '50%';

  return (
    <>
      <defs>
        <path id={id} d={makePath(getCenteredRadius(0))} />
        {lines?.[1] && (
          <path id={`${id}-2`} d={makePath(getCenteredRadius(1))} />
        )}
      </defs>

      {!lines ? (
        <text fill={color} className="arc-text" style={{ fontSize, fontWeight: 900, pointerEvents: 'none' }}>
          <textPath xlinkHref={`#${id}`} startOffset={textOffset} textAnchor="middle">
            {text}
          </textPath>
        </text>
      ) : (
        orderedLines.map((line, i) => (
          <text
            key={i}
            fill={color}
            className="arc-text"
            style={{
              fontSize,
              fontWeight: 900,
              fontFamily: '"Prompt", sans-serif',
              pointerEvents: 'none',
              letterSpacing: '0.04em'
            }}
          >
            <textPath
              xlinkHref={`#${i === 0 ? id : `${id}-2`}`}
              startOffset={textOffset}
              textAnchor="middle"
            >
              {line}
            </textPath>
          </text>
        ))
      )}
    </>
  );
});

function getOuterArcPath(qs: number, qe: number, radius: number, strokeWidth: number): string {
  const capAngle = (strokeWidth / 2 / radius) * (180 / Math.PI);
  const gap = 2.5; 
  const angle1 = qs + gap + capAngle;
  const angle2 = qe - gap - capAngle;
  
  const startRad = (angle1 - 90) * (Math.PI / 180);
  const endRad = (angle2 - 90) * (Math.PI / 180);
  
  const x1 = 500 + radius * Math.cos(startRad);
  const y1 = 500 + radius * Math.sin(startRad);
  const x2 = 500 + radius * Math.cos(endRad);
  const y2 = 500 + radius * Math.sin(endRad);
  
  const largeArcFlag = angle2 - angle1 <= 180 ? '0' : '1';
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
}

function getRoundedSectorPath(
  cx: number, cy: number,
  rIn: number, rOut: number,
  startAngle: number, endAngle: number,
  cornerRadius: number
): string {
  if (cornerRadius <= 0) {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = cx + rOut * Math.cos(startRad);
    const y1 = cy + rOut * Math.sin(startRad);
    const x2 = cx + rOut * Math.cos(endRad);
    const y2 = cy + rOut * Math.sin(endRad);
    const x3 = cx + rIn * Math.cos(endRad);
    const y3 = cy + rIn * Math.sin(endRad);
    const x4 = cx + rIn * Math.cos(startRad);
    const y4 = cy + rIn * Math.sin(startRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  }

  const deltaAngleIn = (cornerRadius / rIn) * (180 / Math.PI);
  const deltaAngleOut = (cornerRadius / rOut) * (180 / Math.PI);

  const getXY = (r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const A = getXY(rIn + cornerRadius, startAngle);
  const H = getXY(rOut - cornerRadius, startAngle);
  const G = getXY(rOut, startAngle + deltaAngleOut);
  const F = getXY(rOut, endAngle - deltaAngleOut);
  const E = getXY(rOut - cornerRadius, endAngle);
  const D = getXY(rIn + cornerRadius, endAngle);
  const C = getXY(rIn, endAngle - deltaAngleIn);
  const B = getXY(rIn, startAngle + deltaAngleIn);

  const largeArcOuter = (endAngle - startAngle - 2 * deltaAngleOut) > 180 ? '1' : '0';
  const largeArcInner = (endAngle - startAngle - 2 * deltaAngleIn) > 180 ? '1' : '0';

  return [
    `M ${A.x} ${A.y}`,
    `L ${H.x} ${H.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${G.x} ${G.y}`,
    `A ${rOut} ${rOut} 0 ${largeArcOuter} 1 ${F.x} ${F.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${E.x} ${E.y}`,
    `L ${D.x} ${D.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${C.x} ${C.y}`,
    `A ${rIn} ${rIn} 0 ${largeArcInner} 0 ${B.x} ${B.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${A.x} ${A.y}`,
    'Z'
  ].join(' ');
}

const InnerSegmentGroup = memo((props: {
  id: string;
  quadId: string;
  startAngle: number;
  endAngle: number;
  onSelect: (t: string, d: any, q: string) => void;
  selection: Selection;
  isActive: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onHoverStart: (hoverId: string | null) => void;
}) => {
  const { id, quadId, startAngle, endAngle, onSelect, selection, isActive, isHovered, isDimmed, onHoverStart } = props;
  const quad = WHEEL_DATA.find(q => q.id === quadId)!;
  
  const fill = (quadId === 'innovation-transformation' || quadId === 'resilient-leadership')
    ? WHEEL_COLORS.creamInner
    : WHEEL_COLORS.greyInner;
    
  const gap = 1.8;
  const rIn = 155;
  const rOut = 295;
  const pathData = getRoundedSectorPath(500, 500, rIn, rOut, startAngle + gap, endAngle - gap, 0);
  
  const scale = isHovered ? 1.03 : isActive ? 1.01 : 1;
  const opacity = isDimmed ? 0.3 : 1;
  
  const midAngle = (startAngle + endAngle) / 2;
  const { x, y } = getLabelCoords(midAngle, 225);
  const textLines = getInnerQuadrantTextLines(quadId);
  
  return (
    <g
      onClick={() => onSelect('intermediate', { name: quad.intermediateName, description: `Core competency area within ${quad.name}.` }, quadId)}
      onMouseEnter={() => onHoverStart(id)}
      onMouseLeave={() => onHoverStart(null)}
      className="cursor-pointer"
      style={{
        transformOrigin: '500px 500px',
        transform: `scale(${scale})`,
        opacity,
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <path
        d={pathData}
        fill={fill}
        style={{
          filter: isHovered ? 'drop-shadow(0 0 12px rgba(22, 36, 60, 0.08))' : 'none',
          transition: 'filter 200ms ease'
        }}
      />
      <MultilineText x={x} y={y} lines={textLines} color="#16243C" />
    </g>
  );
});

const OuterSegmentGroup = memo((props: {
  id: string;
  quadId: string;
  startAngle: number;
  endAngle: number;
  onSelect: (t: string, d: any, q: string) => void;
  selection: Selection;
  isActive: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onHoverStart: (hoverId: string | null) => void;
}) => {
  const { id, quadId, startAngle, endAngle, onSelect, selection, isActive, isHovered, isDimmed, onHoverStart } = props;
  const quad = WHEEL_DATA.find(q => q.id === quadId)!;
  
  const color = (quadId === 'innovation-transformation' || quadId === 'resilient-leadership')
    ? WHEEL_COLORS.yellowOuter
    : WHEEL_COLORS.blueOuter;
    
  const textColor = (quadId === 'innovation-transformation' || quadId === 'resilient-leadership')
    ? '#16243C'
    : '#FFFFFF';
    
  const gap = 6.5;
  const rIn = 310;
  const rOut = 420;
  const pathData = getRoundedSectorPath(500, 500, rIn, rOut, startAngle + gap, endAngle - gap, 0);
  
  const scale = isHovered ? 1.03 : isActive ? 1.01 : 1;
  const opacity = isDimmed ? 0.3 : 1;
  
  return (
    <g
      onClick={() => onSelect('main-category', quad, quadId)}
      onMouseEnter={() => onHoverStart(id)}
      onMouseLeave={() => onHoverStart(null)}
      className="cursor-pointer"
      style={{
        transformOrigin: '500px 500px',
        transform: `scale(${scale})`,
        opacity,
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <path
        d={pathData}
        fill={color}
        style={{
          filter: isHovered ? 'drop-shadow(0 0 15px rgba(22, 36, 60, 0.15))' : 'none',
          transition: 'filter 200ms ease'
        }}
      />
      
      <ArcText
        id={`text-path-${quadId}`}
        text={quad.name}
        radius={365}
        startAngle={startAngle}
        endAngle={endAngle}
        color={textColor}
        fontSize="16px"
      />
    </g>
  );
});

const Wheel = memo(({
  selection,
  onSelect,
  svgRef,
  hoveredSegmentId,
  onHoverStart,
  onWheelLeave,
}: {
  selection: Selection;
  onSelect: (t: string, d: any, q: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  hoveredSegmentId: string | null;
  onHoverStart: (hoverId: string | null) => void;
  onWheelLeave: () => void;
}) => {
  const isCenterActive = selection.quadrantId === 'foundation';
  const isCenterHovered = hoveredSegmentId === 'foundation-center';
  const isCenterDimmed = Boolean(hoveredSegmentId) && hoveredSegmentId !== 'foundation-center';
  
  return (
    <svg ref={svgRef} viewBox="0 0 1000 1000" onMouseLeave={onWheelLeave} style={{ width: '100%', height: '100%', borderRadius: '50%' }}>
      {/* Inner quadrants background shapes */}
      {WHEEL_DATA.map((quad, i) => {
        const qs = i * 90;
        const qe = (i + 1) * 90;
        const id = `inner-${quad.id}`;
        return (
          <InnerSegmentGroup
            key={id}
            id={id}
            quadId={quad.id}
            startAngle={qs}
            endAngle={qe}
            onSelect={onSelect}
            selection={selection}
            isActive={selection.type === 'intermediate' && selection.quadrantId === quad.id}
            isHovered={hoveredSegmentId === id}
            isDimmed={Boolean(hoveredSegmentId) && hoveredSegmentId !== id}
            onHoverStart={onHoverStart}
          />
        );
      })}

      {/* Outer arcs */}
      {WHEEL_DATA.map((quad, i) => {
        const qs = i * 90;
        const qe = (i + 1) * 90;
        const id = `outer-${quad.id}`;
        return (
          <OuterSegmentGroup
            key={id}
            id={id}
            quadId={quad.id}
            startAngle={qs}
            endAngle={qe}
            onSelect={onSelect}
            selection={selection}
            isActive={selection.data === quad}
            isHovered={hoveredSegmentId === id}
            isDimmed={Boolean(hoveredSegmentId) && hoveredSegmentId !== id}
            onHoverStart={onHoverStart}
          />
        );
      })}

      {/* Central Black Circle (Foundation Skills) */}
      <g
        style={{
          transformOrigin: '500px 500px',
          transform: `scale(${isCenterHovered ? 1.04 : isCenterActive ? 1.02 : 1})`,
          opacity: isCenterDimmed ? 0.3 : 1,
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <g transform="translate(500, 500)">
          <circle
            r="154"
            fill="#0A0A0A"
            className="cursor-pointer"
            style={{
              filter: isCenterHovered ? 'drop-shadow(0 0 20px rgba(249, 183, 50, 0.4))' : 'none',
              stroke: isCenterHovered || isCenterActive ? '#F9B732' : 'none',
              strokeWidth: 3,
              transition: 'all 200ms ease',
            }}
            onClick={() =>
              onSelect(
                'foundation-category',
                {
                  name: FOUNDATION_SKILLS.title,
                  description: FOUNDATION_SKILLS.subtitle,
                },
                'foundation'
              )
            }
            onMouseEnter={() => onHoverStart('foundation-center')}
            onMouseLeave={() => onHoverStart(null)}
          />

          <text
            x="0"
            y="-22"
            textAnchor="middle"
            fill="#F9B732"
            style={{
              fontSize: '21px',
              fontWeight: 900,
              fontFamily: '"Prompt", sans-serif',
              letterSpacing: '0.12em',
              pointerEvents: 'none',
            }}
          >
            FOUNDATION
          </text>
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fill="#F9B732"
            style={{
              fontSize: '21px',
              fontWeight: 900,
              fontFamily: '"Prompt", sans-serif',
              letterSpacing: '0.12em',
              pointerEvents: 'none',
            }}
          >
            SKILLS
          </text>
          <text
            x="0"
            y="42"
            textAnchor="middle"
            fill="#FFFFFF"
            style={{
              fontSize: '12px',
              fontWeight: 900,
              fontFamily: '"Prompt", sans-serif',
              letterSpacing: '0.08em',
              pointerEvents: 'none',
            }}
          >
            AI FOR EVERYONE
          </text>
        </g>
      </g>
    </svg>
  );
});

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    handler();
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function getCategoryIcon(id: string) {
  const I = id === 'strategic-value' ? ICONS.Target : id === 'resilient-leadership' ? ICONS.Zap : id === 'succeeding-stakeholders' ? ICONS.Users : id === 'innovation-transformation' ? ICONS.Lightbulb : ICONS.Info;
  return <span style={{ width: 20, height: 20, display: 'inline-block' }}><I /></span>;
}

export default function App() {
  const [selection, setSelection] = useState<Selection>({ type: null, data: null, quadrantId: null });
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMobile = useIsMobile();
  const selectedQuadrant = selection.quadrantId ? WHEEL_DATA.find(q => q.id === selection.quadrantId) : null;

  const handleReset = useCallback(() => setSelection({ type: null, data: null, quadrantId: null }), []);
  const handleSelection = useCallback((type: string, data: any, quadrantId: string) => setSelection({ type, data, quadrantId }), []);
  
  const canGoBack =
    selection.type === 'subcategory' ||
    selection.type === 'topic' ||
    selection.type === 'foundation';
    
  const handleBack = useCallback(() => {
    if (selection.type === 'foundation') {
      setSelection({
        type: 'foundation-category',
        data: { name: FOUNDATION_SKILLS.title, description: FOUNDATION_SKILLS.subtitle },
        quadrantId: 'foundation',
      });
      return;
    }
    if (!selectedQuadrant) return;
    if (selection.type === 'subcategory') {
      setSelection({ type: 'main-category', data: selectedQuadrant, quadrantId: selectedQuadrant.id });
      return;
    }
    if (selection.type === 'topic') {
      setSelection({
        type: 'intermediate',
        data: {
          name: selectedQuadrant.intermediateName,
          description: `Core competency area within ${selectedQuadrant.name}.`,
        },
        quadrantId: selectedQuadrant.id,
      });
    }
  }, [selection.type, selectedQuadrant]);

  const handleHoverStart = useCallback((hoverId: string | null) => setHoveredSegmentId(hoverId), []);
  const handleWheelLeave = useCallback(() => setHoveredSegmentId(null), []);

  const handleOpenCourse = useCallback(() => {
    const courseName = (selection.data as any)?.name;
    if (!courseName) return;

    const payload = {
      source: 'competency-wheel-embed',
      action: 'open_course',
      courseName: String(courseName)
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }

    const courseUrl =
      (selection.data as any)?.courseUrl ||
      'https://www.minddojo.co.th/workshop';

    window.open(courseUrl, '_blank', 'noopener,noreferrer');
  }, [selection.data]);
  
  return (
    <div className="course-wheel-page min-h-screen w-full flex items-center justify-center bg-transparent overflow-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .arc-text {
          font-family: "Prompt", sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          paint-order: stroke;
          stroke-linejoin: round;
        }
        .wheel-segment {
          cursor: pointer;
        }
        .wheel-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .wheel-popup-box {
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          max-width: 480px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          color: white;
        } 
        html,
        body,
        #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: transparent !important;
        }
      `}</style>

      <main className="flex items-center justify-center p-4 max-w-5xl w-full mx-auto">
        <div className="w-full max-w-[800px] aspect-square flex items-center justify-center">
          <Wheel
            selection={selection}
            onSelect={handleSelection}
            svgRef={svgRef}
            hoveredSegmentId={hoveredSegmentId}
            onHoverStart={handleHoverStart}
            onWheelLeave={handleWheelLeave}
          />
        </div>
      </main>

      {selection.type && (
        <div className="wheel-popup-overlay" onClick={handleReset}>
          <div className="wheel-popup-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {canGoBack && (
                    <button
                      onClick={handleBack}
                      aria-label="ย้อนกลับ"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        background: 'rgba(255,255,255,.08)',
                        border: '1px solid rgba(255,255,255,.12)',
                        borderRadius: 12,
                        color: '#fff',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <ICONS.ChevronLeft />
                    </button>
                  )}
                  <div style={{ padding: 10, background: '#F9B732', borderRadius: 12, color: '#111' }}>
                    {selection.quadrantId ? getCategoryIcon(selection.quadrantId) : <ICONS.Info />}
                  </div>
                  <span style={{ fontSize: 14, color: '#F9B732', fontWeight: 800, textTransform: 'uppercase' }}>
                    {String(selection.type).replace('-', ' ')}
                  </span>
                </div>
                <button onClick={handleReset} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                  <ICONS.X />
                </button>
              </div>
              <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>{(selection.data as any)?.name}</h2>
              <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 20, lineHeight: 1.5 }}>{(selection.data as any)?.description}</p>
              
              {(
                selection.type === 'subcategory' ||
                selection.type === 'topic' ||
                selection.type === 'foundation'
              ) && (
                <button onClick={handleOpenCourse} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(249,183,50,.25)', background: '#F9B732', color: '#111', fontWeight: 900, fontSize: 16, cursor: 'pointer', transition: 'all 150ms ease' }} className="hover:brightness-110 active:scale-95">เปิดหลักสูตร</button>
              )}
              
              {selection.type === 'main-category' && (
                <div style={{ marginTop: 14 }}>
                  {(selection.data as WheelCategory).subCategories.map((s, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'subcategory', data: s, quadrantId: (selection.data as WheelCategory).id })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16, cursor: 'pointer', transition: 'all 150ms ease' }} className="hover:bg-white/10">{s.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
              
              {selection.type === 'intermediate' && (
                <div style={{ marginTop: 14 }}>
                  {(selectedQuadrant?.topics || []).map((t, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'topic', data: t, quadrantId: selection.quadrantId })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16, cursor: 'pointer', transition: 'all 150ms ease' }} className="hover:bg-white/10">{t.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
              
              {selection.type === 'foundation-category' && (
                <div style={{ marginTop: 14 }}>
                  {FOUNDATION_SKILLS.bullets.map((b, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'foundation', data: b, quadrantId: 'foundation' })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16, cursor: 'pointer', transition: 'all 150ms ease' }} className="hover:bg-white/10">{b.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
