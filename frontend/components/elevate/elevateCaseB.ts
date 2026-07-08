import type { CanvasSection, ElevateCaseContent } from './ElevateAnswerKeySections';

const table = (headers: string[], rows: string[][]): CanvasSection['blocks'][number] => ({
  type: 'table',
  headers,
  rows,
});
const bullets = (items: string[]): CanvasSection['blocks'][number] => ({ type: 'bullets', items });
const text = (value: string): CanvasSection['blocks'][number] => ({ type: 'text', text: value });
const sub = (value: string): CanvasSection['blocks'][number] => ({ type: 'subheading', text: value });

const CASE_B_INTRO = {
  title: 'ELEVATE · ANSWER KEY (FACILITATOR)',
  caseTitle: 'Case B — Beihan · Full Canvas Answer Key',
  meta: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  note:
    'FACILITATOR NOTE — Model answers for every canvas in the ELEVATE deck, filled for Case B — Beihan (China). Beihan is a fast-scaling, high-turnover, performance-driven plant — a revolving door. Reward any response honest to the case that traces to the OKRs and the IMPACTS / MWB1 priorities. Other valid answers exist.',
  footer: 'Designed by Thepparith (Teejay) Senamngern · MindDojo',
};

const streamBlock = (
  name: string,
  successFactors: string,
  rows: string[][],
  challenges: string,
  target: string,
) => [
  sub(name),
  text(`Success factors: ${successFactors}`),
  table(['M1-M2', 'M3-M4', 'M5-M6', 'M7-M8', 'M9-M10', 'M11-M12'], rows),
  text(`Challenges: ${challenges}`),
  text(`🎯 Year-1 target: ${target}`),
];

const CASE_B_DAY1: CanvasSection[] = [
  {
    id: 'canvas-1',
    title: 'CANVAS 1 · CONFIRM THE CASE — PLANT SNAPSHOT',
    blocks: [
      sub('Plant snapshot — size · tenure · workforce mix'),
      table(
        ['Dimension', 'Beihan reality'],
        [
          ['Size', '~1,500 people; doubled in ~5 yrs. ~1,000 operators · ~250 technicians · ~180 engineers/staff · ~70 managers & section heads.'],
          ['Tenure & age', 'Mean age ~31; avg tenure only ~4 yrs; ~48% under 30. A young plant that hires fast and churns fast.'],
          ['Manager bench', '~55% of managers promoted in under 3 yrs — thin, under-prepared leadership bench (~70 section heads).'],
          ['Workforce mix', 'Young, ambitious, mobile technical workforce; 24% female (diversity OKR pressure). Union + workers\' congress present.'],
          ['Products / pressure', 'Passenger tyres; EV-fitment lines expanding. GM (Mr. Liu) runs on output, OEE, cost, safety.'],
        ],
      ),
      sub('Culture & ways of working'),
      bullets([
        'Fast, performance-driven and face-conscious (mianzi) — public criticism is costly; honest upward feedback is awkward.',
        'People don\'t grumble quietly — they leave. Dissatisfaction shows up as a resignation letter, not a comment.',
        'Intensity and long hours power the ramp but breed burnout; a younger generation questions whether the price is worth it.',
        'Pride in growth and the Michelin brand — but no felt sense of a future worth staying for.',
      ]),
      sub('Top 3 people problems'),
      table(
        ['#', 'Problem', 'Why it bites at Beihan'],
        [
          ['1', 'First-year attrition 31% (vs 10% target)', 'A revolving door — nearly a third of new hires gone before their first anniversary; young technicians/engineers leak at 38%.'],
          ['2', 'Under-prepared front-line managers', '~70 managers promoted too fast; strong on technical fixes, weak on career conversations, coaching and feedback (\'My Manager\' = 70).'],
          ['3', 'Invisible careers', 'No visible ladders or growth story a 26-year-old can see herself inside; development is the highest-want, lowest-satisfaction item.'],
        ],
      ),
      sub("What's at stake — the OKRs under pressure"),
      bullets([
        'T1 · Voluntary attrition <1yr — 31% → target ≤10%. The headline wound; it drains every other people investment.',
        'M1 · \'My Manager\' — 70 → 86, held down by fast-promoted leaders.',
        'P3 / A3 · Competencies assessed — 78% / 72% → 100%; assessment lags the pace of hiring.',
        'S1 · Engagement 70→85 · S2 · Social Climate 52→60 · C2 · Safe Space 66→≥80 — all below region.',
        'Business currency — churn costs Mr. Liu ramp speed, scrap and overtime — that is how People work earns his funding.',
      ]),
      sub('Open questions / unknowns'),
      bullets([
        'How to build leaders fast enough for growth WITHOUT over-promoting the next person too soon?',
        'How to offer real careers in a plant still finding its shape?',
        'How to raise voice & Safe Space in a face-conscious culture where exit replaces voice?',
        'How to launch anything credible in the shadow of the failed retention bonus?',
        'How to price the revolving door in Mr. Liu\'s currency so he funds the cure — and engage the union/workers\' congress early?',
      ]),
    ],
  },
  {
    id: 'canvas-2',
    title: 'CANVAS 2 · TRANSLATE HQ PRIORITIES → PLANT',
    blocks: [
      text('FACILITATOR NOTE — Take each GIVEN top-down priority and write what it means, concretely, at Beihan. This feeds the Cover Story.'),
      sub('① IMPACTS pillars — what each demands at Beihan'),
      table(
        ['IMPACTS pillar', 'What it means concretely at Beihan'],
        [
          ['I-CARE', 'Fast-promoted managers know the words but don\'t yet live the behaviours — make ICARE a taught, felt daily practice, not a poster.'],
          ['Management quality', '~70 managers promoted in 2–3 yrs, under-prepared — equip section heads to lead people, not just fix machines.'],
          ['People readiness', 'A young workforce judges the plant by growth speed — competency assessment must catch up with hiring; build visible skilling.'],
          ['Agile P operations', 'Appraisal & development processes buckle under turnover — make them light, complete and churn-proof.'],
          ['Collective intelligence', 'Face-conscious culture; exit over voice; 24% female — open safe upward channels and protect diversity in a mobile market.'],
          ['Total experience', '31% of new hires gone in year one — the loudest pillar; build a journey worth staying for.'],
          ['Social cohesion', 'Engagement 70, climate 52 — you can\'t build deep cohesion while losing a third of juniors each year.'],
        ],
      ),
      sub('② MWB1 · DOMF \'People Focus\' workstreams (WS1–6)'),
      table(
        ['MWB1 workstream', 'What it means at Beihan'],
        [
          ['WS1 · ICARE for all', 'Teach and embed ICARE with the fast-promoted managers who were never trained in it.'],
          ['WS2 · Managerial skills', 'A manager-development rhythm so new section heads are equipped BEFORE they lead 18 people.'],
          ['WS3 · High-performing teams', 'Thicken the thin bench — buddies, squads and coaching so a stuck technician gets an answer fast.'],
          ['WS4 · Mastering competencies', 'Close the assessment gap (78→100%); a skills matrix so growth is visible and honest.'],
          ['WS5 · Local attractivity', 'Win and keep young talent against EV start-ups — real career paths beat a 30% raise across the road.'],
          ['WS6 · Inclusive workforce', 'Protect & grow diversity (24% female) and give voice a safe channel in a face-conscious culture.'],
        ],
      ),
      sub('③ OKR Declination · MO Asia 2026 — the target numbers, translated'),
      table(
        ['OKR (measure)', 'AS-IS → Target', 'What it means at Beihan'],
        [
          ['T1 · Attrition <1yr', '31% → ≤10%', 'Break the revolving door — the make-or-break number; fix managers + paths, not another bonus.'],
          ['M1 · \'My Manager\'', '70 → 86', 'Every fast-promoted section head becomes a capable people-leader.'],
          ['M3 · IPA 2 cycles', '60% → 85%', 'Make appraisal survive turnover — light, regular, actually completed.'],
          ['P3 · Competencies assessed', '78% → 100%', 'Assessment catches up with hiring; growth is visible to every young hire.'],
          ['C2 · Safe Space', '66 → ≥80', 'Open channels where people voice concerns instead of resigning.'],
          ['T1/S1/S2 climate', 'Eng 70→85 · Climate 52→60', 'Cohesion follows once the plant stops leaking its juniors.'],
        ],
      ),
      sub('④ Priorities declined by geography / local priorities'),
      bullets([
        'China / MO Asia context: the hottest EV-and-battery labour market on earth — \'your context is not an excuse, it is the plan\'. No allowance for a doubled headcount.',
        'Local plant priority: connect People work to Mr. Liu\'s line (ramp speed, scrap, overtime) so investment follows a clear churn-cost case.',
        'Engage the trade union & workers\' congress early on fairness, development and workload — they lend a roadmap legitimacy.',
      ]),
    ],
  },
  {
    id: 'canvas-3',
    title: 'CANVAS 3 · COVER STORY · OKR VISION',
    blocks: [
      sub('① Cover headline (past tense)'),
      text('BEIHAN: WHERE YOUNG TALENT CHOOSES TO STAY AND GROW'),
      sub('Hero image'),
      text('A section head and a young technician mapping a 3-year career path together on the ramp floor.'),
      sub('Key words that define success'),
      text('Grow · Lead · Stay'),
      sub('② Big headlines (the wins)'),
      bullets([
        'First-year attrition cut 31% → 12% — the revolving door closed.',
        'Every one of ~70 section heads trained to coach and hold a monthly growth conversation.',
        'Every new hire has a mentor and a visible career path from week one.',
        '\'My Manager\' 70 → 84; Safe Space 66 → 80 — people speak up instead of walking out.',
      ]),
      sub('③ Sidebars (supporting stories)'),
      bullets([
        'Manager-onboarding rhythm live — no one leads 18 people unprepared.',
        'Honest career ladders published; a 25-year-old can see two moves ahead.',
        'Retention driven by managers & paths, not a bonus — the sister-plant model, adapted.',
        'Union & workers\' congress co-own the fairness and workload story.',
      ]),
      sub('④ Quotes (voices from the future)'),
      bullets([
        'Young technician: "I asked how fast I could move up. This time, my manager drew me the path."',
        'Section head (Wang Lei): "I finally know how to lead, not just fix — and I have something real to offer my best people."',
        'GM (Mr. Liu): "Lower churn gave me back ramp speed and overtime. People work moved my numbers."',
      ]),
      sub('⑤ OKRs this future delivers'),
      bullets([
        'Attrition <1yr 31 → 12% · \'My Manager\' 70 → 84 · Engagement 70 → 82 · Safe Space 66 → 80 · ICARE 68 → 82 · Competencies assessed 78 → 100%.',
      ]),
      sub('⑥ Why this matters to me'),
      text('We must build our people as fast as we build our tyres — a young plant that grows its own future instead of re-hiring it every year. I built this team from scratch; I won\'t watch it walk across the road.'),
    ],
  },
  {
    id: 'canvas-4',
    title: 'CANVAS 4 · 7S GAP — CURRENT → DESIRED → GAP → REMEDY → OKR',
    blocks: [
      table(
        ['S', 'AS-IS (today)', 'TO-BE (3 yrs)', 'GAP', 'REMEDY', 'OKR'],
        [
          ['Strategy', 'People = staffing the ramp; not linked to the business.', 'People run as a retention & capability strategy tied to Mr. Liu\'s line.', 'People work seen as staffing, not a lever on output.', 'Price churn in ramp/scrap/overtime; embed P-Roadmap in the plant plan.', 'All / S1·T1'],
          ['Structure', 'Young team built for hiring speed, not development.', 'Team structured for careers, coaching & manager capability.', 'No development or career-architecture capacity.', 'Add a development/career-path owner; area people partners.', 'M3·P3'],
          ['Systems', 'Appraisal/development buckle under churn; discredited bonus.', 'Light, complete IPA + competency assessment; no gameable bonus.', 'Processes collapse under turnover; assessment incomplete.', 'Churn-proof IPA cadence; finish assessment; retire the bonus.', 'M3·P3·A3'],
          ['Style', 'Fast, face-conscious; exit over voice; burnout.', 'Coaching, monthly growth talk, safe upward voice; sustainable pace.', 'No dialogue; dissatisfaction exits silently.', 'Monthly 1:1s; Safe-Space channels; workload signals acted on.', 'C2·M1·S2'],
          ['Staff', 'Young, mobile; managers over-promoted; thin bench.', 'Prepared managers; young talent with a reason to stay.', 'Leaders lead before they\'re ready; bench too thin.', 'Manager-onboarding BEFORE leading; buddies thicken the bench.', 'M1·T1'],
          ['Skills', 'Technical strong; people-leadership & coaching weak; ICARE uneven.', 'Managers who coach, run career talks & live ICARE.', 'People-leadership capability gap.', 'ICARE + coaching sprint; career-conversation training.', 'M1·I1·I2'],
          ['Shared values', 'Pride in growth & brand; no \'future worth staying for\'.', 'A shared, felt promise of growth young people believe.', 'No lived story of a future here.', 'Publish honest ladders; recognition rituals; ICARE lived daily.', 'S1·T1·C2'],
        ],
      ),
      sub('Culture note that shapes every remedy'),
      bullets([
        'In a face-conscious, mobile market every weak manager and stalled career is instantly expensive — the exit is one conversation away. Work WITH the culture: private respect over public criticism, concrete paths over slogans, and never another gameable fix.',
      ]),
    ],
  },
  {
    id: 'canvas-5',
    title: 'CANVAS 5 · PRIORITISE · OPPORTUNITY CANVAS',
    blocks: [
      text('FACILITATOR NOTE — ~8 brainstormed ideas scored on Attractiveness (1–5) × Organizational Fit (Poor/Partial/Good). Top 2–3 carried forward.'),
      table(
        ['#', 'Idea', 'Attractiveness (1–5)', 'Org. Fit', 'Zone / call'],
        [
          ['1', 'Manager-onboarding & development rhythm (before they lead)', '5', 'Good', 'CORE GROWTH — carry forward'],
          ['2', 'Visible, honest career ladders (see 2 moves ahead)', '5', 'Partial', 'BIG BET — carry forward'],
          ['3', 'Monthly development conversation (trained, expected)', '5', 'Good', 'CORE GROWTH — carry forward'],
          ['4', 'Structured 90-day onboarding + buddy for every hire', '4', 'Good', 'Core Growth — Year 1 quick win'],
          ['5', 'Recognition & belonging rituals (low-cost, not a bonus)', '3', 'Good', 'Core Growth'],
          ['6', 'Price churn in Mr. Liu\'s currency (ramp/scrap/OT dashboard)', '4', 'Partial', 'Big Bet — unlocks funding'],
          ['7', 'Safe-Space / voice channels via union & congress', '3', 'Partial', 'Big Bet — culture move'],
          ['8', 'Another retention bonus / lump-sum incentive', '2', 'Poor', 'AVOID — gameable, discredited'],
        ],
      ),
      sub('Big Bets & Core Growth to carry forward'),
      bullets([
        'Core Growth (do now) — Manager-onboarding & development rhythm; Monthly development conversation; 90-day onboarding + buddy.',
        'Big Bets (build capability first) — Visible career ladders; price churn in the GM\'s currency to fund it all.',
        'Avoid — Another retention bonus — it stays to the payout date, games the scheme, and confirms the cynical lesson.',
      ]),
    ],
  },
  {
    id: 'canvas-6',
    title: 'CANVAS 6 · FIVE BOLD STEPS · 3-YEAR P-ROADMAP',
    blocks: [
      sub('① Vision statement'),
      bullets([
        'Beihan is the plant where young talent stays and grows — capable leaders, honest career paths, and a floor where the best people no longer have to leave to move up.',
      ]),
      sub('② Essential themes · ③ how each shows up'),
      table(
        ['Theme', 'How it shows up at Beihan'],
        [
          ['Lead', 'Every fast-promoted section head is equipped to coach before they lead.'],
          ['Path', 'A 25-year-old can see two honest moves ahead — growth is visible.'],
          ['Stay', 'Retention comes from managers & paths, not a gameable bonus.'],
          ['Voice', 'People speak up safely instead of resigning — in a face-conscious culture.'],
          ['Prove', 'Lower churn is priced in the GM\'s currency; People moves the numbers.'],
        ],
      ),
      sub('⑥ The 5 bold steps to get there'),
      table(
        ['#', 'Bold step (verb-led)', 'OKR link', 'Years'],
        [
          ['1', 'Build front-line leaders — manager-onboarding & ICARE+coaching sprint before anyone leads a team.', 'M1·I1·I2', 'Y1→Y3'],
          ['2', 'Make careers visible — honest ladders + monthly development conversation, trained & expected.', 'M3·P3·T1', 'Y1→Y2'],
          ['3', 'Fix the first 90 days — structured onboarding + trained buddy for every hire.', 'T1·P4', 'Y1'],
          ['4', 'Recognise & belong beyond the bonus — low-cost recognition rituals; retire the gameable scheme.', 'C2·S1', 'Y1→Y2'],
          ['5', 'Protect a sustainable pace — track workload signals; engage union/congress on fairness & load.', 'S2·A3', 'Y2→Y3'],
        ],
      ),
      sub('④ Supports — what enables us'),
      bullets([
        'GM sponsorship once churn is priced in his currency · sister-plant model to learn from · union/workers\' congress as a fairness channel · a young team of excellent recruiters ready to re-skill · brand pull that still counts.',
      ]),
      sub('⑤ Challenges — what hinders us'),
      bullets([
        'Ramp pressure vs pulling managers off the line · the hottest EV/battery labour market · the shadow of the failed bonus · thin manager bench · face-conscious culture where exit replaces voice · sustaining energy past the first year.',
      ]),
      sub('⑦ Key values'),
      bullets(['Respect (mianzi-aware) · Growth · ICARE · Fairness · "We grow the future together"']),
    ],
  },
  {
    id: 'canvas-7',
    title: 'CANVAS 7 · PEOPLE ROADMAP — 6 MWB1 LANES × 3 YEARS',
    blocks: [
      text('FACILITATOR NOTE — For each lane/year: the Strategic Activity + the OKR it serves. Every lane converges on the plant vision.'),
      table(
        ['MWB1 lane', 'YEAR 1 (activity · OKR)', 'YEAR 2 (activity · OKR)', 'YEAR 3 (activity · OKR)'],
        [
          ['ICARE for all', 'ICARE + coaching sprint for ~70 managers · ICARE 68→75', 'ICARE in daily practice; manager forum · 78', 'ICARE lived on the floor · 82 (I2)'],
          ['Managerial skills', 'Manager-onboarding rhythm; leader-as-coach; monthly 1:1s · MyMgr 70→76', '\'Good-to-great manager\'; mentoring pairs · 80', 'Every section head a people-leader · 86 (M1)'],
          ['Mastering competencies', 'Finish competency assessment; skills matrix; IDPs · Assessed 78→90%', 'Métier training; career-conversation embed · 96%', 'People readiness sustained · 100% (P3·A3)'],
          ['High-performing teams', 'Buddies & problem-solving squads thicken the bench · SafeSpace 66→72', 'Team huddles; coaching structure · 76', 'Embedded HPT on every line · ≥80 (C2)'],
          ['Local attractivity', '90-day onboarding; honest career ladders; EV-market EVP · Attrition 31→22%', 'Employee-journey redesign; sister-plant model · <16%', 'Employer of choice for young talent · ≤12% (T1)'],
          ['Inclusive workforce', 'Safe-Space channels via union/congress; protect 24% female · Climate 52→55', 'Inclusion & fairness charter; balanced hiring · 58', 'Belong & grow — diversity improving · 60 (S2·C3)'],
        ],
      ),
    ],
  },
  {
    id: 'canvas-8',
    title: 'CANVAS 8 · GAME PLAN · YEAR 1 — THE 6 STREAMS',
    blocks: [
      sub('Primary Year-1 goal'),
      text('First-year attrition 31% → 22% · mentor/buddy coverage 0 → 100%'),
      sub('Secondary Year-1 goal'),
      text('\'My Manager\' 70 → 76 · Competencies assessed 78 → 90% · ICARE 68 → 75'),
      sub('Team you need'),
      text('GM sponsor (Mr. Liu) · line/section heads · trained buddies · HR business partner · young-talent reps · union/congress liaison'),
      sub('Resources you need'),
      text('Manager-training time (ring-fenced) · onboarding kit · buddy time · simple path-map tool · low-cost recognition budget · churn-cost dashboard'),
      ...streamBlock(
        'Stream 1 · ICARE for all',
        'ICARE taught, not postered · Managers practise, not just attend · GM visibly models it',
        [['M1-M2 Design ICARE+coaching sprint', 'M3-M4 Cohort 1 of managers', 'M5-M6 On-floor practice + observation', 'M7-M8 Cohort 2', 'M9-M10 ICARE Talk monthly', 'M11-M12 Review & embed']],
        'Pulling managers off the ramp · Cynicism from past initiatives',
        'ICARE 68 → 75',
      ),
      ...streamBlock(
        'Stream 2 · Managerial skills',
        'No one leads unprepared · Time ring-fenced by GM · Coaching becomes a habit',
        [['M1-M2 Build manager-onboarding rhythm', 'M3-M4 New-section-head equip pack', 'M5-M6 Leader-as-coach training', 'M7-M8 Weekly 1:1s rolled out', 'M9-M10 Peer manager forum', 'M11-M12 Capability check']],
        'Ramp pressure vs release time · Measuring capability, not attendance',
        '\'My Manager\' 70 → 76',
      ),
      ...streamBlock(
        'Stream 3 · Mastering competencies',
        'Assessment catches hiring · Skills visible to each hire · Light, churn-proof IPA',
        [['M1-M2 Fix IPA cadence', 'M3-M4 Competency assessment push', 'M5-M6 Skills matrix live', 'M7-M8 IDP per role', 'M9-M10 Quarterly path review', 'M11-M12 Close to 90% assessed']],
        'Turnover disrupts cycles · Data quality under churn',
        'Competencies assessed 78 → 90%',
      ),
      ...streamBlock(
        'Stream 4 · High-performing teams',
        'Buddy on day 1 · Fast answers to stuck techs · Peer + leader recognition',
        [['M1-M2 Design buddy scheme', 'M3-M4 Train buddies', 'M5-M6 Problem-solving squads', 'M7-M8 Team huddles', 'M9-M10 Recognition rituals', 'M11-M12 Review bench depth']],
        'Buddy time vs ramp · Thin bench to draw from',
        'Safe Space 66 → 72',
      ),
      ...streamBlock(
        'Stream 5 · Local attractivity',
        'Every hire assigned a buddy day 1 · Honest ladder published · Path visible in first weeks',
        [['M1-M2 Structured 90-day onboarding', 'M3-M4 Publish career ladders', 'M5-M6 Path-map in onboarding', 'M7-M8 EV-market EVP refresh', 'M9-M10 Stay-conversations at risk points', 'M11-M12 Attrition review']],
        'EV start-ups\' 30% raises · Shadow of the failed bonus',
        'Attrition <1yr 31 → 22%',
      ),
      ...streamBlock(
        'Stream 6 · Inclusive workforce',
        'Voice has a safe channel · Union/congress engaged early · Fairness on load & growth',
        [['M1-M2 Open Safe-Space channels', 'M3-M4 Union/congress workshops', 'M5-M6 Workload-signal tracking', 'M7-M8 Balanced hiring push', 'M9-M10 Fairness charter', 'M11-M12 Climate pulse']],
        'Face-conscious silence · Workload vs volume targets',
        'Social Climate 52 → 55',
      ),
    ],
  },
];

const CASE_B_DAY2: CanvasSection[] = [
  {
    id: 'canvas-9',
    title: 'CANVAS 9 · PROGRESS PLAN (DAY 2) — OVERVIEW + DELIVERABLES',
    blocks: [
      sub('Progress Plan · Overview'),
      table(
        ['Field', 'Filled'],
        [
          ['PP Title', 'Break the Revolving Door — Grow & Keep Young Talent'],
          [
            'Purpose',
            'Beihan loses nearly a third of new hires in year one. This plan attacks the two roots — manager capability and visible careers — to lift Total Experience, \'My Manager\' and Engagement, and cut first-year attrition. It also prices churn in Mr. Liu\'s currency so it stays funded.',
          ],
        ],
      ),
      sub('Indicators'),
      table(
        ['Indicator', 'Definition', 'Target'],
        [
          ['First-year attrition', '% of new hires who leave before 12 months', '31% → 22% (Y1) → ≤12% (Y3)'],
          ['Manager quality', 'MFT \'My Manager\' engagement index', '70 → 76 (Y1) → 86'],
          ['Mentor / path coverage', '% of new hires with a buddy + visible career path', '0 → 100%'],
        ],
      ),
      sub('What success looks like (max 3)'),
      bullets([
        'New hires stay and can name their next two moves — the revolving door slows visibly.',
        'Every fast-promoted section head coaches and runs a monthly growth conversation.',
        'Mr. Liu sees churn cost fall in ramp speed, scrap and overtime — and keeps funding it.',
      ]),
      sub('Key conditions of success (max 3)'),
      bullets([
        'GM sponsorship secured by pricing churn in his currency; manager time ring-fenced.',
        'No new gameable bonus — credibility rebuilt through managers and paths, not money.',
        'Union & workers\' congress engaged early on fairness, development and workload.',
      ]),
      sub('Deliverables & timeline'),
      table(
        ['N°', 'Deliverable', 'Responsible', 'Start → Due', 'Status'],
        [
          ['1', 'Churn-cost dashboard (ramp/scrap/OT) to win GM funding', 'SP Manager (Zhang Mei)', 'M1 → M2', '🟢 On track'],
          ['2', 'Manager-onboarding & ICARE+coaching sprint — cohort 1', 'HRBP + L&D', 'M2 → M4', '🟢 On track'],
          ['3', '90-day structured onboarding + buddy scheme live', 'SP team', 'M2 → M5', '🟡 At risk'],
          ['4', 'Honest career ladders published (key job families)', 'HRBP', 'M3 → M6', '🟡 At risk'],
          ['5', 'Monthly development-conversation rhythm rolled out', 'Section heads', 'M4 → M7', '🟢 On track'],
          ['6', 'Competency assessment push to 90% + skills matrix', 'SP / area leads', 'M4 → M9', '🟢 On track'],
          ['7', 'Safe-Space channels via union/workers\' congress', 'SP + union liaison', 'M5 → M8', '🟢 On track'],
          ['8', 'Year-1 attrition & engagement review vs target', 'SP Manager', 'M11 → M12', '🟢 On track'],
        ],
      ),
    ],
  },
];

export const ELEVATE_CASE_B: ElevateCaseContent = {
  intro: CASE_B_INTRO,
  day1Sections: CASE_B_DAY1,
  day2Sections: CASE_B_DAY2,
};
