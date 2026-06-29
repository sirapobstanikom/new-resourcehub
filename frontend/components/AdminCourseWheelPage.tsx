import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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
  },
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
  }
];

const FOUNDATION_SKILLS = {
  title: 'Foundation Skills',
  subtitle: 'AI for Everyone',
  bullets: [
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
    {
      name: 'Prompt Engineering for Business Leaders',
      description: 'เรียนรู้การออกแบบ Prompt อย่างเป็นระบบ เพื่อใช้ AI ช่วยคิด วิเคราะห์ วางแผน และเพิ่มประสิทธิภาพการทำงานของทีมและองค์กรอย่างมีประสิทธิผล',
      courseUrl: 'https://www.minddojo.co.th/family-course/-prompt-engineering-for-business-leaders'
    }
  ]
};

const WHEEL_COLORS = {
  dark: { main: '#1E293B', middle: '#334155', outer: '#0F172A', text: '#F8FAFC' },
  accent: { main: '#F59E0B', middle: '#FBBF24', outer: '#FCD34D', text: '#111827' },
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

const LINE_GAP = 25;
function splitTextMultiLine(text: string): string[] | null {
    if (text === 'Learning and Growth') {
      return [
        'Learning',
        'and',
        'Growth'
      ];
    }
  if (text === 'Strategic Value Creation') {
    return [
      'Strategic Value',
      'Creation'
    ];
  }
  const normalized = String(text)
    .replace(/\//g, ' / ')
    .replace(/&/g, ' & ')
    .trim();

  const words = normalized.split(/\s+/);

  // สั้นๆ ไม่ต้องแยก
  if (words.length <= 2 && normalized.length < 18) {
    return null;
  }

  // 6 คำขึ้นไป หรือยาวมาก → 4 บรรทัด
  if (words.length >= 5 || normalized.length > 32) {
    return [
      words[0] || '',
      words[1] || '',
      words[2] || '',
      words.slice(3).join(' ')
    ];
  }

  // 4 คำขึ้นไป → 3 บรรทัด
  if (words.length >= 4 || normalized.length > 22) {
    return [
      words[0] || '',
      words[1] || '',
      words.slice(2).join(' ')
    ];
  }

  // ปกติ 2 บรรทัด
  const mid = Math.ceil(words.length / 2);

  return [
    words.slice(0, mid).join(' '),
    words.slice(mid).join(' ')
  ];
}
const ArcText = memo(({
  id,
  text,
  radius,
  startAngle,
  endAngle,
  color = 'currentColor',
  fontSize = '22px'
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
  const isUpsideDown =
    normalizedMidAngle > 95 && normalizedMidAngle < 265;

  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const makePath = (r: number) => {
    const x1 = 500 + r * Math.cos(startRad);
    const y1 = 500 + r * Math.sin(startRad);

    const x2 = 500 + r * Math.cos(endRad);
    const y2 = 500 + r * Math.sin(endRad);

    const normalPath =
      `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;

    const reversePath =
      `M ${x2} ${y2} A ${r} ${r} 0 0 0 ${x1} ${y1}`;

    return isUpsideDown ? reversePath : normalPath;
  };

  const lines = splitTextMultiLine(text);
  const totalLines = lines?.length || 1;

  const getCenteredRadius = (index: number) => {
    const offset =
      (index - (totalLines - 1) / 2) * LINE_GAP;

    return radius - offset;
  };

  const orderedLines =
    lines && isUpsideDown
      ? [...lines].reverse()
      : lines;

  const textOffset =
    isUpsideDown ? '48%' : '50%';

  return (
    <>
      <defs>
        <path
          id={id}
          d={makePath(getCenteredRadius(0))}
        />

        {lines?.[1] && (
          <path
            id={`${id}-2`}
            d={makePath(getCenteredRadius(1))}
          />
        )}

        {lines?.[2] && (
          <path
            id={`${id}-3`}
            d={makePath(getCenteredRadius(2))}
          />
        )}
        {lines?.[3] && (
          <path
            id={`${id}-4`}
            d={makePath(getCenteredRadius(3))}
          />
        )}
      </defs>

      {!lines ? (
        <text fill={color} className="arc-text">
          <textPath
            xlinkHref={`#${id}`}
            startOffset={textOffset}
            textAnchor="middle"
          >
            {text}
          </textPath>
        </text>
      ) : (
        orderedLines.map((line, i) => (
          <text
            key={i}
            fill={color}
            className="arc-text"
            style={{ fontSize }}
          >
            <textPath
              xlinkHref={`#${i === 0 ? id : `${id}-${i + 1}`}`}
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

const SegmentGroup = memo((props: {
  id: string; text: string; startAngle: number; endAngle: number; innerRadius: number; outerRadius: number; fill: string;
  textColor: string; onSelect: (t: string, d: any, q: string) => void; selectionType: string; selectionData: any; quadrantId: string;
  isActive: boolean; isHovered: boolean; isDimmed: boolean; textRadius: number;
  onHoverStart: (hoverId: string | null) => void;
}) => {
  const {
    id,
    text,
    startAngle,
    endAngle,
    innerRadius,
    outerRadius,
    fill,
    textColor,
    onSelect,
    selectionType,
    selectionData,
    quadrantId,
    isActive,
    isHovered,
    isDimmed,
    textRadius,
    onHoverStart,
  } = props;
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);
  const x1 = 500 + outerRadius * Math.cos(startRad);
  const y1 = 500 + outerRadius * Math.sin(startRad);
  const x2 = 500 + outerRadius * Math.cos(endRad);
  const y2 = 500 + outerRadius * Math.sin(endRad);
  const x3 = 500 + innerRadius * Math.cos(endRad);
  const y3 = 500 + innerRadius * Math.sin(endRad);
  const x4 = 500 + innerRadius * Math.cos(startRad);
  const y4 = 500 + innerRadius * Math.sin(startRad);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  const scale = isHovered ? 1.04 : isActive ? 1.02 : 1;
  const opacity = isDimmed ? 0.28 : 1;
  const filter = isHovered ? 'drop-shadow(0 0 18px rgba(254,210,1,0.35)) brightness(1.08)' : 'none';
  return (
    <g
      onClick={() => onSelect(selectionType, selectionData, quadrantId)}
      onMouseEnter={() => onHoverStart(id)}
      onMouseLeave={() => onHoverStart(null)}
      className="cursor-pointer"
      style={{ transformOrigin: '500px 500px', transform: `scale(${scale})`, opacity, filter, transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease' }}
    >
  
      <path d={d} fill={fill} className={`wheel-segment ${isActive ? 'active' : ''}`} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <ArcText id={id} text={text} radius={textRadius} startAngle={startAngle} endAngle={endAngle} color={textColor} />
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
}) => (
  <svg ref={svgRef} viewBox="0 0 1000 1000" onMouseLeave={onWheelLeave} style={{ width: '100%', height: '100%', borderRadius: '50%' }}>
    <circle cx="500" cy="500" r="429" fill="none" stroke="rgba(223, 53, 53, 0.04)" strokeWidth="1" />
    {WHEEL_DATA.map((quad, i) => {
      const qs = i * 90;
      const qe = (i + 1) * 90;
      return (
        <g key={`outer-${quad.id}`}>
          <SegmentGroup
            id={`text-main-${quad.id}`}
            text={quad.name}
            startAngle={qs}
            endAngle={qe}
            innerRadius={284}
            outerRadius={429}
            textRadius={357}
            fill={quad.color === 'yellow' ? WHEEL_COLORS.accent.main : WHEEL_COLORS.dark.main}
            textColor={quad.color === 'yellow' ? WHEEL_COLORS.accent.text : WHEEL_COLORS.dark.text}
            isActive={selection.data === quad}
            isHovered={hoveredSegmentId === `text-main-${quad.id}`}
            isDimmed={Boolean(hoveredSegmentId) && hoveredSegmentId !== `text-main-${quad.id}`}
            onHoverStart={onHoverStart}
            onSelect={onSelect}
            selectionType="main-category"
            selectionData={quad}
            quadrantId={quad.id}
          />
        </g>
      );
    })}
    {WHEEL_DATA.map((quad, i) => {
      const qs = i * 90;
      const qe = (i + 1) * 90;
      return (
        <g key={`inner-${quad.id}`}>
          <SegmentGroup
            id={`text-inter-${quad.id}`}
            text={quad.intermediateName}
            startAngle={qs}
            endAngle={qe}
            innerRadius={167}
            outerRadius={282}
            textRadius={225}

            fill={quad.color === 'yellow' ? WHEEL_COLORS.accent.middle : WHEEL_COLORS.dark.middle}
            textColor={quad.color === 'yellow' ? WHEEL_COLORS.accent.text : WHEEL_COLORS.dark.text}
            isActive={selection.type === 'intermediate' && selection.quadrantId === quad.id}
            isHovered={hoveredSegmentId === `text-inter-${quad.id}`}
            isDimmed={Boolean(hoveredSegmentId) && hoveredSegmentId !== `text-inter-${quad.id}`}
            onHoverStart={onHoverStart}
            onSelect={onSelect}
            selectionType="intermediate"
            selectionData={{ name: quad.intermediateName, description: `Core competency area within ${quad.name}.` }}
            quadrantId={quad.id}
          />
        </g>
      );
    })}
  {(() => {
    const isCenterHovered = hoveredSegmentId === 'foundation-center';
    const isCenterDimmed = Boolean(hoveredSegmentId) && hoveredSegmentId !== 'foundation-center';
    const isCenterActive = selection.quadrantId === 'foundation';
    const centerScale = isCenterHovered ? 1.04 : isCenterActive ? 1.02 : 1;
    const centerOpacity = isCenterDimmed ? 0.28 : 1;

    return (
      <g
        style={{
          transformOrigin: '500px 500px',
          transform: `scale(${centerScale})`,
          opacity: centerOpacity,
          transition: 'transform 180ms ease, opacity 180ms ease',
        }}
      >
        <g transform="translate(500, 500)">
          <circle
            r="165"
            fill="#111"
            stroke={isCenterHovered || isCenterActive ? 'rgba(254,210,1,0.6)' : 'rgba(0,0,0,0.3)'}
            strokeWidth={isCenterHovered || isCenterActive ? 2 : 1}
            className="wheel-segment cursor-pointer"
            style={{
              filter: isCenterHovered ? 'drop-shadow(0 0 18px rgba(254,210,1,0.35)) brightness(1.08)' : 'none',
              transition: 'filter 180ms ease, stroke 180ms ease',
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

          <foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            x="-180"
            y="-140"
            width="360"
            height="280"
            style={{ pointerEvents: 'none' }}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 16,
                pointerEvents: 'none',
              }}
            >
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#fed201',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  margin: '0 0 8px 0',
                }}
              >
                {FOUNDATION_SKILLS.title}
              </h3>

              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#9ca3af',
                  margin: 0,
                  lineHeight: 1.2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {FOUNDATION_SKILLS.subtitle}
              </p>
            </div>
          </foreignObject>
        </g>
      </g>
    );
  })()}
  </svg>
));

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

const AdminCourseWheelPage: React.FC = () => {
  const [selection, setSelection] = useState<Selection>({ type: null, data: null, quadrantId: null });
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMobile = useIsMobile();
  const selectedQuadrant = selection.quadrantId ? WHEEL_DATA.find(q => q.id === selection.quadrantId) : null;

  // เปลี่ยนจาก
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'course-wheel-bg-override';
    style.textContent = `html, body { background: white !important; background-color: white !important; background-image: none !important; }`;
    document.head.appendChild(style);
    return () => { document.getElementById('course-wheel-bg-override')?.remove(); };
  }, []);

  // เป็น
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyStyle = body.getAttribute('style') || '';
    const prevHtmlStyle = html.getAttribute('style') || '';
    
    body.setAttribute('style', prevBodyStyle + '; background: white !important; background-color: white !important; background-image: none !important;');
    html.setAttribute('style', prevHtmlStyle + '; background: white !important; background-color: white !important; background-image: none !important;');
    
    return () => {
      body.setAttribute('style', prevBodyStyle);
      html.setAttribute('style', prevHtmlStyle);
    };
  }, []);
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
    <div className="course-wheel-page" style={{width: '100vw',height: '100vh',overflow: 'hidden',display: 'flex',justifyContent: 'center',alignItems: 'center',background: 'white' }}>
      <style>{`
        *{box-sizing:border-box}.arc-text{font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;paint-order:stroke;stroke-linejoin:round;text-shadow:0 1px 2px rgba(0,0,0,.2)}
        .wheel-segment{cursor:pointer}.wheel-segment:hover{stroke:rgba(255,255,255,.4);stroke-width:1.5px}.wheel-segment.active{stroke:rgba(255,255,255,.5);stroke-width:2px}
        .glass-panel{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);box-shadow:0 25px 50px -12px rgba(0,0,0,.25)}
        .main-content{flex-direction:column}.wheel-wrap{margin-bottom:64px}@media(min-width:1024px){.main-content{flex-direction:row}.wheel-wrap{margin-bottom:0}}
        .wheel-popup-overlay{position:fixed;inset:0;background:transparent;z-index:100;display:flex;align-items:center;justify-content:center;padding:24px}
        .wheel-popup-box{background: rgba(17, 17, 17, 1);border:1px solid rgba(255,255,255,.1);border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);max-width:480px;width:100%;max-height:85vh;overflow-y:auto}
        html:has(.course-wheel-page), 
        body:has(.course-wheel-page) {
          background-color: transparent !important;
          background-image: none !important;
          background: transparent !important;
        }
        
        /* ลบเงาหรือ Layout ที่อาจจะสร้างแถบสีดำ */
        .main-content {
          background: transparent !important;
        }
      `}</style>


      <main className="main-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 48, maxWidth: 1600, margin: '0 auto', width: '100%' }}>
        <div className="wheel-wrap" style={{ position: 'relative', width: '100%', maxWidth: 850, flexShrink: 0, aspectRatio: isMobile ? 'auto' : '1' }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden' }}>
            <Wheel
              selection={selection}
              onSelect={handleSelection}
              svgRef={svgRef}
              hoveredSegmentId={hoveredSegmentId}
              onHoverStart={handleHoverStart}
              onWheelLeave={handleWheelLeave}
            />
          </div>
          <div style={{ position: 'absolute', left: '50%', bottom: isMobile ? -54 : -42, transform: 'translateX(-50%)', width: 'min(92vw, 420px)', zIndex: 20 }}>
            <Link
              to="/peer-feedback"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 18px',
                borderRadius: 999,
                background: '#fed201',
                color: '#111',
                fontWeight: 900,
                textAlign: 'center',
                textDecoration: 'none',
                boxShadow: '0 18px 40px rgba(254, 210, 1, 0.28)',
                border: '1px solid rgba(17, 17, 17, 0.12)',
              }}
            >
              Peer Feedback — Audience Grid
            </Link>
          </div>
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
                  <div style={{ padding: 10, background: '#fed201', borderRadius: 12, color: '#111' }}>{selection.quadrantId ? getCategoryIcon(selection.quadrantId) : <ICONS.Info />}</div>
                  <span style={{ fontSize: 14, color: '#fed201', fontWeight: 800, textTransform: 'uppercase' }}>{String(selection.type).replace('-', ' ')}</span>
                </div>
                <button onClick={handleReset} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><ICONS.X /></button>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>{(selection.data as any)?.name}</h2>
              <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5 }}>{(selection.data as any)?.description}</p>
              {(
                selection.type === 'subcategory' ||
                selection.type === 'topic' ||
                selection.type === 'foundation'
              ) && (
                <button onClick={handleOpenCourse} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(254,210,1,.25)', background: '#fed201', color: '#111', fontWeight: 900, fontSize: 16 }}>เปิดหลักสูตร</button>
              )}
              {selection.type === 'main-category' && (
                <div style={{ marginTop: 14 }}>
                  {(selection.data as WheelCategory).subCategories.map((s, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'subcategory', data: s, quadrantId: (selection.data as WheelCategory).id })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16 }}>{s.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
              {selection.type === 'intermediate' && (
                <div style={{ marginTop: 14 }}>
                  {(selectedQuadrant?.topics || []).map((t, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'topic', data: t, quadrantId: selection.quadrantId })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16 }}>{t.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
              {selection.type === 'foundation-category' && (
                <div style={{ marginTop: 14 }}>
                  {FOUNDATION_SKILLS.bullets.map((b, i) => (
                    <button key={i} onClick={() => setSelection({ type: 'foundation', data: b, quadrantId: 'foundation' })} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, marginBottom: 8, color: '#fff', fontSize: 16 }}>{b.name}<ICONS.ChevronRight /></button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseWheelPage;
