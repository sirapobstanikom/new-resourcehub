import React from 'react';

type TableBlock = { type: 'table'; headers: string[]; rows: string[][] };
type BulletsBlock = { type: 'bullets'; items: string[] };
type TextBlock = { type: 'text'; text: string };
type SubheadingBlock = { type: 'subheading'; text: string };

export type ContentBlock = TableBlock | BulletsBlock | TextBlock | SubheadingBlock;

export type CanvasSection = {
  id: string;
  title: string;
  blocks: ContentBlock[];
};

const table = (headers: string[], rows: string[][]): TableBlock => ({ type: 'table', headers, rows });
const bullets = (items: string[]): BulletsBlock => ({ type: 'bullets', items });
const text = (value: string): TextBlock => ({ type: 'text', text: value });
const sub = (value: string): SubheadingBlock => ({ type: 'subheading', text: value });

export const ELEVATE_INTRO = {
  title: 'ELEVATE · ANSWER KEY (FACILITATOR)',
  caseTitle: 'Case A — Thanaburi · Full Canvas Answer Key',
  meta: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  note:
    'Facilitator reference only. All figures and individuals are illustrative (per the teaching case). Model answers — other responses honest to the case, the OKRs and the IMPACTS/MWB1 priorities are equally valid. Thanaburi context throughout: strong seniority & kreng-jai culture · two workforces (veteran core + young hires) · ~70 supervisors promoted for technical skill, not leadership · young-technician attrition.',
  footer: 'Designed by Thepparith (Teejay) Senamngern · MindDojo',
};

export const DAY1_SECTIONS: CanvasSection[] = [
  {
    id: 'canvas-1',
    title: 'CANVAS 1 · CONFIRM THE CASE — PLANT SNAPSHOT & PROBLEM FRAMING',
    blocks: [
      sub('Plant snapshot (size · tenure · workforce mix)'),
      table(
        ['Dimension', 'Thanaburi today'],
        [
          ['Site & product', 'Thanaburi (RYO), Eastern Seaboard, ~2 hrs SE of Bangkok · passenger & light-truck tyres · EV-fitment lines planned'],
          ['Headcount', '~1,800 across 3 shifts — ~1,250 operators · ~280 technicians · ~200 engineers/staff · ~70 managers/section heads'],
          ['Tenure', 'Avg operator tenure 11 yrs (many 20+); 45% aged 45+, 22% under 30 — a two-generation plant'],
          ['Supervisors', '~90% ex-operator, promoted for their hands, little/no people-management training (~70 section heads)'],
          ['SP (People) team', 'Apinya (new Site SP Manager, 7 weeks in) + 2 officers, newly re-purposed from admin/services'],
          ['Diversity', 'Female 19% of all categories (gender-diversity OKR pressure)'],
        ],
      ),
      sub('Culture & ways of working'),
      bullets([
        'Seniority + kreng-jai. Respect for rank; reluctance to contradict or trouble a senior. Problems raised quietly after the meeting, via a trusted intermediary — not aired in the room.',
        'Harmony-preserving. Directive, senior-led, conflict-avoiding — stable for 20 years, but it suppresses the upward signal a transformation needs (Safe Space 64).',
        'Two workforces. Veteran core — loyal, deep machine knowledge, quietly sceptical of change. Young hires — mobile, vocal on pay & development, quick to leave.',
        'Lead by habit, not capability. Supervisors manage by example and seniority; they step in and fix, rather than coach. ICARE is a lanyard, not a habit.',
        'Change-fatigue. 2023 “Thanaburi Together” made noise then faded → the floor meets any new initiative with polite patience meaning “we\'ve seen this before.”',
      ]),
      sub('Top 3 people problems'),
      table(
        ['#', 'Problem', 'Why it bites'],
        [
          ['1', 'Front-line leadership capability gap', '~70 supervisors never taught to lead → “My Manager” 74, rushed appraisals, young hires unseen. The single root behind most OKR gaps.'],
          ['2', 'Young-talent attrition', '26% of young technicians leave in year one (18% overall) — a development-and-respect problem the hot Eastern-Seaboard labour market makes expensive.'],
          ['3', 'No safe upward voice', 'Safe Space 64; kreng-jai + hierarchy mean people spot problems but don\'t speak (the 20-minute silence on Line 4). Recognition (61) & development (58) the lowest clusters.'],
        ],
      ),
      sub("What's at stake — which OKRs are under pressure"),
      table(
        ['Pillar', 'Key result', 'AS-IS', 'Target', 'Read'],
        [
          ['Social cohesion', 'MFT Engagement', '72', '85', 'below region — top-line risk'],
          ['Management quality', 'MFT “My Manager”', '74', '86', 'capability gap'],
          ['Total experience', 'Voluntary attrition <1 yr', '18%', '≤10%', 'nearly 2× the ceiling'],
          ['Collective intelligence', 'MFT Safe-Space', '64', '≥80', 'culture signal'],
          ['I-CARE', 'ICARE-behaviours score', '70', '85', 'model not embedded'],
          ['Mgmt quality', 'IPA 2 cycles complete', '68%', '85%', 'half-finished discipline'],
          ['Social cohesion', 'Social Climate index', '48', '60', 'below region'],
        ],
      ),
      text('Coherent story, not a random scatter: almost every gap traces to one root — the quality & confidence of front-line leadership. One well-chosen bold step can move several OKRs at once.'),
      sub('Open questions to resolve'),
      bullets([
        'How do we raise Safe Space in a culture where speaking up to seniors is itself uncomfortable — without importing a Western directness that would fail here?',
        'How do we ask supervisors promoted for their hands to now lead with head and heart, when they\'re already stretched and no one taught them?',
        'How do we keep a 28-year-old with three offers while honouring the 50-year-old operator beside her?',
        'How do we launch anything credible in the long shadow of “Thanaburi Together”?',
        'How do we win Plant Director Veerasak (who measures OEE) and partner — not clash — with the labour committee?',
      ]),
    ],
  },
  {
    id: 'canvas-2',
    title: 'CANVAS 2 · TRANSLATE HQ PRIORITIES → PLANT',
    blocks: [
      sub('IMPACTS pillars — what each concretely means at Thanaburi'),
      table(
        ['Pillar', 'What it asks for', 'What it means at Thanaburi'],
        [
          ['I-CARE', 'Leaders who behave to the model', 'Turn ICARE from a lanyard into a daily habit at handover & on the floor — model it, coach to it (target 70→85)'],
          ['Management quality', 'Capable, confident front-line managers', 'Teach ~70 ex-operator supervisors to lead, coach & hold appraisal conversations (My Manager 74→86)'],
          ['People readiness', 'Right skills, assessed & qualified', 'EV ramp-up makes skilling a production risk — finish competency assessment (82%→100%) and MMW T01 to Bronze'],
          ['Agile P operations', 'Efficient, complete People processes', 'Close half-finished disciplines — complete IPA cycles; assess SP-role competencies (75%→100%)'],
          ['Collective intelligence', 'Voice · safe space · diversity', 'Build Thai-appropriate upward voice (Safe Space 64→≥80); lift female share from 19%; MMW T05 to Bronze'],
          ['Total experience', 'A journey worth staying for', 'Fix onboarding & development so young technicians stay (attrition 18%→≤10%; recognition 61→ up)'],
          ['Social cohesion', 'Engagement & social climate', 'Move the top-line — Engagement 72→85, Social Climate 48→60 — via leadership, voice & recognition'],
        ],
      ),
      sub('MWB1 “People Focus” — workstreams WS1–WS6 at Thanaburi'),
      table(
        ['WS', 'MWB1 lane', 'At Thanaburi it means…'],
        [
          ['WS1', 'ICARE for all', 'Every leader lives ICARE on the floor — handover dialogue, recognition, coaching; Bronze+ on MMW behaviour practices'],
          ['WS2', 'Managerial skills', 'Supervisor Leadership Academy — the core bet; the skills that change how a supervisor spends Monday morning'],
          ['WS3', 'Mastering competencies', 'Complete competency assessment & skilling for the EV-era product mix; close the People-readiness gap'],
          ['WS4', 'High-performing teams', 'Monthly career/IPA conversation as a habit; teams that spot-speak-solve faster than a 20-minute silence'],
          ['WS5', 'Local attractivity', 'Win & keep young technical talent on the Eastern Seaboard; onboarding that builds belonging in 90 days'],
          ['WS6', 'Inclusive workforce', 'Safe upward voice that fits Thai culture; lift female share; veteran + young talent both engaged'],
        ],
      ),
      sub('OKR Declination · MO Asia 2026 — target numbers at Thanaburi'),
      table(
        ['Pillar', 'Key result (measure)', 'AS-IS 2025', 'Target 26/27'],
        [
          ['I-CARE', 'I1 · MMW T02 practice — % site at Bronze', '55%', '90%'],
          ['I-CARE', 'I2 · MFT ICARE-behaviours score', '70', '85'],
          ['Management quality', 'M1 · MFT “My Manager” score', '74', '86'],
          ['Management quality', 'M3 · IPA 2 cycles complete (12-mo rolling)', '68%', '85%'],
          ['People readiness', 'P3 · % job competencies assessed after qualification', '82%', '100%'],
          ['People readiness', 'P4 · MMW T01 practice — % site at Bronze', '60%', '90%'],
          ['Agile P operations', 'A3 · % competencies assessed — SP jobs', '75%', '100%'],
          ['Collective intelligence', 'C2 · MFT Safe-Space score', '64', '≥80'],
          ['Collective intelligence', 'C3 · Gender diversity (all categories)', '19%', 'improve'],
          ['Collective intelligence', 'C4 · MMW T05 practice — % site at Bronze', '50%', '90%'],
          ['Total experience', 'T1 · Voluntary attrition < 1 year', '18%', '≤10%'],
          ['Social cohesion', 'S1 · MFT Engagement', '72', '85'],
          ['Social cohesion', 'S2 · Michelin Social Climate index', '48', '60'],
        ],
      ),
      sub('Priorities declined by geography — the chain'),
      bullets([
        'Global. “Empowering People Forward” — unleash talent by fuelling trust, inclusion & collective intelligence (the IMPACTS pillars).',
        'Region (MO Asia, Singapore). Same OKRs to every plant — no gentler set for Thanaburi. “Your context is not an excuse — it is the plan.”',
        'Site (Thanaburi). Apinya owns the translation — the same global OKRs, the right moves for this workforce, this culture, this moment.',
        'Floor. Chain: IMPACTS pillars → OKR declination → site People Roadmap → Year-1 plan → the plant floor. Her value = the quality of that translation.',
      ]),
    ],
  },
  {
    id: 'canvas-3',
    title: 'CANVAS 3 · COVER STORY · OKR VISION — “THANABURI 2029”',
    blocks: [
      sub('Cover headline + hero image (the future front page)'),
      table(
        ['Element', 'Filled'],
        [
          ['Cover headline (past tense)', 'THANABURI: THE PLANT THAT LISTENS — AND LEADS'],
          ['Hero image', 'A veteran operator and a young technician at the Line-4 handover board, talking — the veteran pointing, the young one writing. ICARE behaviours visibly in use.'],
          ['Masthead / date', 'Thanaburi Plant Newsletter · 2029 edition'],
        ],
      ),
      sub('Big headlines — the wins'),
      bullets([
        'First-year stayers up from 82% to 90% — we keep the future talent we used to lose.',
        'Every supervisor is now a coach, not just a checker — “My Manager” 74→86.',
        'Safe to speak up, the Thai way — upward voice that gets acted on (Safe Space 64→≥80).',
        'Monthly career conversation is now a habit on every shift — not an annual form.',
        'ICARE lives on the floor to Bronze+ — a habit in conversations, not a name on a lanyard.',
      ]),
      sub('Sidebars'),
      bullets([
        'Veteran mentor. “The young ones stay now — because someone finally asked what they want to become.”',
        'EV-ramp readiness. 100% of job competencies assessed — the plant is skilled for the mix of the next three years.',
        'Recognition wall. A simple, repeated supervisor-recognition routine — good work is seen every week.',
      ]),
      sub('Quotes from the future'),
      bullets([
        '“In three years someone asked me what I wanted to become — so I stayed.” — technician, 28',
        '“I know the machine and now I know the person. My line runs better for it.” — Khun Somchai, supervisor',
        '“People work moved my line — capability lifted OEE and churn stopped costing us output.” — Plant Director Veerasak',
        '“We shaped this change with them, not to them.” — labour-committee member',
      ]),
      sub('OKRs this future delivers'),
      text('Engagement 72→85 · My Manager 74→86 · Attrition <1yr 18%→≤10% · Safe Space 64→≥80 · ICARE 70→85 · Social Climate 48→60.'),
      sub('Why this matters'),
      text('We owe the people who built this plant a place where they are heard, grown and proud — and the young ones a reason to build their future here. That image, not the spreadsheet, is where the roadmap starts.'),
    ],
  },
  {
    id: 'canvas-4',
    title: 'CANVAS 4 · 7S GAP — AS-IS → TO-BE · GAP · REMEDY · OKR',
    blocks: [
      table(
        ['S', 'AS-IS (today)', 'TO-BE (3 yrs)', 'Gap', 'Remedy', 'OKR served'],
        [
          ['Strategy', 'People treated as support, not strategy; SP reactive; no People objectives in the plant plan', 'People Roadmap owned in the PD\'s meeting; SP a Business Partner speaking OEE/cost/capability', 'People work not connected to the line', 'Translate roadmap into line-impact; win PD sponsorship; report People in the morning meeting', 'S1 · S2'],
          ['Structure', 'SP team thin & newly re-purposed; 2 officers, admin-strong, not embedded', 'Officers embedded as partners in production areas; change agents per shift', 'No partnering muscle / floor presence', 'Re-role officers to partner areas; recruit 2 change agents/shift', 'M1 · A3'],
          ['Systems', 'IPA cycles incomplete; competency assessment partial; several MMW below Bronze', 'IPA a monthly habit; 100% competencies assessed; MMW T01/T02/T05 at Bronze+', 'Half-embedded disciplines', 'Simple IPA tool + habit; finish assessment; drive MMW to Bronze', 'M3 · P3 · P4 · A3 · C4'],
          ['Style', 'Directive, hierarchical, harmony-preserving; low upward feedback', 'Dialogue & recognition both ways; safe, Thai-appropriate upward voice', 'Silence suppresses the signal', 'Listen-and-act loops via committee; small-group / 1:1 channels; leaders model ICARE', 'C2 · I2'],
          ['Staff', 'Two workforces — ageing loyal core + young mobile group leaving early', 'Both engaged; veterans mentor; young talent sees a path & stays', 'Young-talent flight; supervisor people-skill gap', 'Youth onboarding + veteran mentoring; keep & grow young technicians', 'T1 · S1'],
          ['Skills', 'Technical strong; coaching / people-leadership weak; ICARE not a habit', 'Supervisors coach, develop, recognise & hold hard conversations; ICARE a habit', 'The core capability gap', 'Supervisor Leadership Academy — the anchor bold step', 'M1 · I1 · I2'],
          ['Shared values', 'Pride in the product, not yet in the promise; EPF not felt on the floor', 'People proud of the promise — they can say what EPF means on a Tuesday', 'Promise not lived', 'Embed ICARE & EPF rituals daily; make the values visible in behaviour', 'I1 · C4'],
        ],
      ),
    ],
  },
  {
    id: 'canvas-5',
    title: 'CANVAS 5 · PRIORITISE · OPPORTUNITY CANVAS',
    blocks: [
      text('~8 brainstormed improvement ideas — placed on Attractiveness × Organizational Fit'),
      table(
        ['#', 'Improvement idea', 'Attractiveness (1–5)', 'Org. fit', 'Verdict'],
        [
          ['A', 'Supervisor Leadership Academy (front-line coaching capability)', '5', 'Good', 'BIG BET — carry forward'],
          ['B', 'Monthly career / IPA conversation as a habit (simple tool)', '5', 'Good', 'BIG BET — carry forward'],
          ['C', 'Thai-appropriate safe upward-voice loop (listen + act)', '5', 'Partial', 'BIG BET — carry forward'],
          ['D', 'Youth onboarding (first-90-days) + veteran mentoring', '4', 'Good', 'Core Growth Opportunity'],
          ['E', 'Simple, repeated supervisor-recognition routine', '4', 'Good', 'Core Growth Opportunity'],
          ['F', 'Finish competency assessment & EV-era skilling', '4', 'Partial', 'Core Growth Opportunity'],
          ['G', 'Pay / bonus increase to stem attrition', '3', 'Poor', 'Park — not the real driver (respect > pay)'],
          ['H', 'Poster / values re-launch campaign', '2', 'Poor', 'Reject — repeats the “Thanaburi Together” mistake'],
        ],
      ),
      sub('Read of the grid'),
      bullets([
        'Big Bets (high attractiveness, needs work on fit). A · B · C — the three that change how a supervisor spends Monday morning. Carry these forward as the roadmap anchors.',
        'Core Growth Opportunities (good fit, steady value). D · E · F — enablers that compound the big bets and protect retention & readiness.',
        'Park / reject. G pay alone doesn\'t fix a development-and-respect problem; H a campaign repeats 2023. Do not try to move everything — pick the few and protect them for three years.',
      ]),
    ],
  },
  {
    id: 'canvas-6',
    title: 'CANVAS 6 · FIVE BOLD STEPS · 3-YEAR P-ROADMAP',
    blocks: [
      sub('Vision statement'),
      bullets(['By 2029, Thanaburi is the plant that listens and leads — where every supervisor is a coach, every person is heard the Thai way, and our young talent builds their future here.']),
      sub('5 essential themes (how each shows up)'),
      table(
        ['Theme', 'How it shows up on the floor'],
        [
          ['Coach', 'Supervisors run coaching conversations, not just checks — Somchai “knows the person, not only the machine”'],
          ['Voice', 'Upward signal is safe & acted on — the 20-minute silence on Line 4 is gone'],
          ['Grow', 'A visible development path — young hires can say what they\'ll become here'],
          ['Recognise', 'Good work is seen weekly — recognition no longer the lowest cluster'],
          ['Together', 'Change is shaped with veterans & the labour committee, not done to them'],
        ],
      ),
      sub('The 5 bold steps'),
      table(
        ['#', 'Bold step', 'OKR link', 'Years'],
        [
          ['1', 'Build front-line leaders — Supervisor Leadership Academy', 'M1 · I1 · I2', 'Y1→Y3'],
          ['2', 'Make the monthly career conversation a habit (IPA)', 'M3 · P3', 'Y1→Y2'],
          ['3', 'Create safe upward voice that fits Thai culture', 'C2 · S1', 'Y1→Y3'],
          ['4', 'Win & keep young technical talent (onboarding + mentoring)', 'T1 · S1', 'Y1→Y2'],
          ['5', 'Embed ICARE & EPF on the floor to Bronze+', 'I1 · C4', 'Y2→Y3'],
        ],
      ),
      sub('Supports · Challenges · Key values'),
      table(
        ['Supports (what enables us)', 'Challenges (what hinders us)', 'Key values'],
        [
          [
            'PD sponsorship once line-impact is shown\nDeep floor trust in the SP team\nActive, constructive labour committee\nStrong veteran mentors\nSister-plant proof it works',
            'Releasing supervisors from the line\nKreng-jai — fear of speaking up\nHot Eastern-Seaboard labour market\n“Thanaburi Together” scepticism\nThin People team & modest budget',
            'Respect (seniority honoured)\nHarmony with honesty\nTrust — act on what we hear\nPride in people, not only product\nEmpowering People Forward',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-7',
    title: 'CANVAS 7 · PEOPLE ROADMAP — 6 MWB1 LANES × 3 YEARS',
    blocks: [
      table(
        ['Lane', 'Year 1 — Strategic activity (OKR)', 'Year 2 (OKR)', 'Year 3 (OKR)'],
        [
          ['ICARE for all', 'Define ICARE floor behaviours; leaders model at handover (I2)', 'Coach-to-ICARE across all shifts; MMW T02 to Bronze (I1)', 'ICARE a habit plant-wide; Bronze+ sustained (I1·I2)'],
          ['Managerial skills', 'Supervisor Leadership Academy cohort 1 (M1)', 'Cohorts 2–3; peer coaching circles (M1)', 'Academy self-sustaining; My Manager 86 (M1)'],
          ['Mastering competencies', 'Map EV-era competencies; assess SP jobs (A3)', 'Skilling plan; assess after qualification to 95% (P3)', '100% assessed; MMW T01 Bronze (P3·P4)'],
          ['High-performing teams', 'Monthly IPA/career conversation live on 1–2 shifts (M3)', 'IPA habit all shifts to 80%+ (M3)', 'IPA 85% + development visible (M3)'],
          ['Local attractivity', 'Redesign first-90-days onboarding; veteran mentoring (T1)', 'Career pathways for young technicians (T1)', 'Attrition ≤10% held; employer of choice (T1·S1)'],
          ['Inclusive workforce', 'Thai-appropriate upward-voice loop; committee co-owns (C2)', 'Act-on-feedback visible; female share rising (C2·C3)', 'Safe Space ≥80; diversity improved; MMW T05 Bronze (C2·C4)'],
        ],
      ),
    ],
  },
  {
    id: 'canvas-8',
    title: 'CANVAS 8 · GAME PLAN · YEAR 1 — 6 STREAMS',
    blocks: [
      sub('Primary & secondary goals'),
      bullets([
        'Primary goal. My Manager 74→79 · first-year attrition 18%→14%',
        'Secondary goal. Safe Space 64→70 · IPA completion 68%→80%',
      ]),
      table(
        ['Stream', 'Success factors', 'Month-by-month (M1-2 … M11-12)', 'Challenges', 'Year-1 target'],
        [
          ['1 · ICARE for all', 'PD models it · defined floor behaviours · daily rituals', 'M1-2 define ICARE behaviours · M3-4 leaders model at handover · M5-8 coach-to-ICARE on pilot shifts · M9-12 spread & measure', 'Sustaining energy · avoiding poster-mode', 'ICARE-behaviours 70→75 · T02 55→70%'],
          ['2 · Managerial skills', 'PD sponsorship · protected supervisor time · practical curriculum', 'M1-2 design Academy + release plan · M3-4 cohort 1 launch · M5-8 on-the-job coaching · M9-12 cohort 2 + review', 'Releasing supervisors from the line', 'My Manager 74→79 · 1–2 cohorts trained'],
          ['3 · Mastering competencies', 'EV competency map · assessment routine', 'M1-2 map competencies · M3-6 assess SP jobs · M7-10 assess-after-qualification · M11-12 skilling plan', 'Time/assessor capacity vs line demand', 'SP assessed 75→90% · comp. assessed 82→90%'],
          ['4 · High-performing teams', 'Simple IPA template · a manager habit every shift', 'M1-2 build simple IPA tool · M3-4 pilot on 1–2 shifts · M5-8 embed monthly · M9-12 all shifts + coach', 'Consistency across day & night shifts', 'IPA complete 68→80% · monthly on all shifts'],
          ['5 · Local attractivity', '6 veteran mentors recruited & recognised · redesigned first-90-days', 'M1-2 redesign onboarding · M3-4 recruit & train mentors · M5-8 mentoring live for new hires · M9-12 career pathway pilot', 'Veteran buy-in and their time', 'First-yr attrition 18→14% · onboarding NPS up'],
          ['6 · Inclusive workforce', 'Visible act-on-feedback · committee co-owns · Thai-appropriate channels', 'M1-2 co-design voice loop w/ committee · M3-4 first listening sessions · M5-8 act on & publish quick wins · M9-12 embed & measure', 'Kreng-jai — fear of speaking up', 'Safe Space 64→70 · 2+ visible quick wins'],
        ],
      ),
      sub('Team you need · Resources you need'),
      table(
        ['Team you need', 'Resources you need'],
        [
          [
            'PD sponsor · shift supervisors · veteran mentors · labour-committee reps · 2 change agents per shift · Apinya + 2 SP officers embedded',
            'Training budget (prioritised, not spread thin) · protected supervisor time · meeting space · a simple IPA tool · recognition budget · sister-plant playbook',
          ],
        ],
      ),
    ],
  },
];

export const DAY2_SECTIONS: CanvasSection[] = [
  {
    id: 'canvas-9',
    title: 'CANVAS 9 · PROGRESS PLAN — OVERVIEW + DELIVERABLES & TIMELINE',
    blocks: [
      sub('Overview'),
      table(
        ['Field', 'Filled'],
        [
          ['PP Title', 'Thanaburi People Roadmap 2026–29 — “The Plant that Listens and Leads”'],
          [
            'Purpose',
            'Turn the MO Asia OKR declination into a site People plan Thanaburi will actually follow — lifting engagement, manager quality and retention by building front-line leadership, a monthly career conversation, and safe Thai-appropriate voice, held steady for three years.',
          ],
        ],
      ),
      sub('Indicators'),
      table(
        ['Indicator', 'Definition', 'Target'],
        [
          ['Manager quality', 'MFT “My Manager” score', '74 → 86 by 26/27 (Y1: 79)'],
          ['Young-talent retention', 'Voluntary attrition < 1 year of service', '18% → ≤10% (Y1: 14%)'],
          ['Safe upward voice', 'MFT Safe-Space score', '64 → ≥80 (Y1: 70)'],
        ],
      ),
      sub('What success looks like (max 3)'),
      bullets([
        'Supervisors run coaching & monthly career conversations by habit on every shift — “My Manager” climbing.',
        'Young technicians stay — first-year attrition inside target — because they see a path and feel seen.',
        'People speak up the Thai way and see it acted on — Safe Space up, quick wins visible on the floor.',
      ]),
      sub('Key conditions of success (max 3)'),
      bullets([
        'PD Veerasak sponsors it because it\'s framed in line-impact — capability lifts OEE, retention protects output.',
        'Labour committee co-owns the design — change with the workforce, not done to it.',
        'We pick the few bold moves and protect them for three years — no repeat of “Thanaburi Together”.',
      ]),
      sub('Deliverables & timeline'),
      table(
        ['N°', 'Deliverable', 'Responsible', 'Start → Due', 'Status'],
        [
          ['1', 'P-Roadmap approved by PD & regional SP Director', 'Apinya (SP Mgr)', 'Feb → Mar 2026', 'In progress'],
          ['2', 'Supervisor Leadership Academy — design & cohort-1 launch', 'SP + L&D + PD', 'Mar → May 2026', 'Planned'],
          ['3', 'Simple IPA / monthly career-conversation tool', 'SP officers', 'Mar → Apr 2026', 'Planned'],
          ['4', 'Thai-appropriate upward-voice loop (with labour committee)', 'Apinya + committee', 'Apr → Jun 2026', 'Planned'],
          ['5', 'First-90-days onboarding + 6 veteran mentors recruited', 'SP + veteran mentors', 'Apr → Jul 2026', 'Planned'],
          ['6', 'EV-era competency map & assessment routine', 'SP + engineering', 'May → Oct 2026', 'Planned'],
          ['7', 'Supervisor-recognition routine live on all shifts', 'Supervisors + SP', 'Jun → Sep 2026', 'Planned'],
          ['8', 'Year-1 review vs OKRs + Year-2 plan', 'Apinya (SP Mgr)', 'Dec 2026 → Jan 2027', 'Planned'],
        ],
      ),
    ],
  },
  {
    id: 'day2-reference',
    title: 'DAY-2 REFERENCE · INSPIRE & MOBILISE + THE 3 CHANGE-INJECT ROUNDS',
    blocks: [
      sub('Inspire & Mobilise canvas — a strong filled example'),
      table(
        ['#', 'Element', 'Filled'],
        [
          ['①', 'Vision message', '“A plant where every operator is trusted, growing and proud — we build the future together.”'],
          ['②', 'Stakeholder groups', 'Ageing loyal operators · young technicians · supervisors · labour committee'],
          ['③', 'Their ‘why’', 'Veterans: respect & legacy · Young: growth & a path · Supervisors: less firefighting · All: a stronger, secure plant'],
          ['④', 'Change agents', '2 respected veterans + 1 supervisor per shift — carry the message, mentor, surface concerns'],
          ['⑤', 'Onboarding moves', 'Shift listening sessions · co-design one quick win · monthly career talk · visible sponsor'],
          ['⑥', 'First response', 'Name the fear · re-connect to the vision · let a veteran answer peer-to-peer · show the first quick win'],
        ],
      ),
      sub('The 3 rounds — recommended responses (hardest → easiest)'),
      table(
        ['Round', 'Signal', 'Strong response', 'Red flags'],
        [
          [
            '1 · RESISTANCE\n“Decided in Singapore — not with us.”',
            'Quiet, cultural withdrawal (kreng-jai) across two workforces, PD watching. Can\'t order your way out.',
            'Listen first, Thai-appropriately (1:1 / small-group, own the miss) · re-connect to the vision · give each shift real influence over the “how” · mobilise a respected supervisor as change agent',
            'Defending “the region decided” · relying on compliance · reading silence as agreement',
          ],
          [
            '2 · COMMUNICATION\n“The message bent between shifts.”',
            'One-way message left a gap; fear filled it. Go direct, two-way, fast.',
            'Go direct same day — address night shift in person; state plainly no extra monitoring/target hike · open a two-way Q&A board · change agents per shift carry the accurate message',
            'Email-only fix or delay · blaming the night shift · one more one-way announcement',
          ],
          [
            '3 · NEGATIVITY\n“We did this in 2023.”',
            'Disappointed, not disengaged — the 2023 memory is real, concentrated in one convertible person.',
            'Go to him privately, with respect — acknowledge 2023 honestly, don\'t defend it · show what\'s different (visible sponsor, real quick win, his voice heard) · offer him a role mentoring the change',
            'Public confrontation · dismissing him as negative · arguing the past away',
          ],
        ],
      ),
      text('Reward responses that inspire the vision, motivate through people\'s own ‘why’, mobilise a change agent, and bring people onboard — not overpower resistance. Frameworks: Kotter · Prosci ADKAR.'),
    ],
  },
];

export type ElevateCaseContent = {
  intro: typeof ELEVATE_INTRO;
  day1Sections: CanvasSection[];
  day2Sections: CanvasSection[];
};

export const ELEVATE_CASE_A: ElevateCaseContent = {
  intro: ELEVATE_INTRO,
  day1Sections: DAY1_SECTIONS,
  day2Sections: DAY2_SECTIONS,
};

function renderBlock(block: ContentBlock, index: number) {
  if (block.type === 'subheading') {
    return (
      <h4 key={index} className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-yellow-300/90">
        {block.text}
      </h4>
    );
  }
  if (block.type === 'text') {
    return (
      <p key={index} className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
        {block.text}
      </p>
    );
  }
  if (block.type === 'bullets') {
    return (
      <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-300">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div key={index} className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {block.headers.map((header) => (
              <th key={header} className="px-3 py-2.5 font-semibold text-yellow-200/90 align-top">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-white/5 even:bg-white/[0.02]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 align-top text-gray-300 whitespace-pre-wrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CanvasSectionCard({ section, index }: { section: CanvasSection; index: number }) {
  return (
    <section id={section.id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="border-b border-white/10 bg-yellow-400/10 px-4 py-3 sm:px-5">
        <p className="text-xs font-bold text-yellow-400/80">Canvas {index}</p>
        <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{section.title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">{section.blocks.map(renderBlock)}</div>
    </section>
  );
}
