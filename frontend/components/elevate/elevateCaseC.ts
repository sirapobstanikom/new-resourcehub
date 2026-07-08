import type { CanvasSection, ElevateCaseContent } from './ElevateAnswerKeySections';

const table = (headers: string[], rows: string[][]): CanvasSection['blocks'][number] => ({
  type: 'table',
  headers,
  rows,
});
const text = (value: string): CanvasSection['blocks'][number] => ({ type: 'text', text: value });
const sub = (value: string): CanvasSection['blocks'][number] => ({ type: 'subheading', text: value });

const CASE_C_INTRO = {
  title: 'ELEVATE · ANSWER KEY (FACILITATOR)',
  caseTitle: 'Case C — Valterra · Full Canvas Answer Key',
  meta: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  note:
    'Facilitator reference. Model, plant-specific answers for every canvas in the current teaching deck — Day 1 (Confirm the Case → Game Plan) and Day 2 (Progress Plan). Reward any answer honest to the Valterra case that traces to the OKRs and the IMPACTS / MWB1 priorities. Other valid answers exist; these are strong exemplars.',
  footer: 'Designed by Thepparith (Teejay) Senamngern · MindDojo',
};

const CASE_C_DAY1: CanvasSection[] = [
  {
    id: 'canvas-1',
    title: 'CANVAS 1 · CONFIRM THE CASE — WHAT IS REALLY GOING ON AT VALTERRA',
    blocks: [
      table(
        ['Element', 'Model answer (Valterra)'],
        [
          [
            'Plant snapshot\n(size · tenure · mix)',
            '~2,400 people, established European site in Castilla y León; passenger & light-truck tyres, chasing EV-era lines.\nAverage age ~47 · average tenure ~18 yrs — a mature, deeply loyal workforce.\nMix: ~1,700 operators · ~350 technicians · ~250 engineers/staff · ~100 managers/section heads (many 20+ yrs).\nStrong works council + unions with real co-determination rights.',
          ],
          [
            'Culture & ways of working',
            'Proud, skilled, unionised — and tired of being changed. Many are second-generation Michelin.\nNot anti-change; anti-being-changed. Courteous, practised resistance that stops change without ever saying "no".\nLeadership calcified into long-tenured habit; supervisors protect teams from disruption.\nVoice is civil but guarded post-2019; belief is withheld until earned.',
          ],
          [
            'Top 3 people problems',
            '1 · Demographic cliff. ~33% of veterans retire within 7 yrs; tacit know-how uncaptured, apprentice pipeline too thin.\n2 · Change-averse culture. Openness-to-change 58 vs region 74; a plant optimised for stability, not adaptation.\n3 · Trust debt from 2019. "Transformation" = loss; Safe-Space 70, diversity 15% — a guarded, ageing, male base.',
          ],
          [
            "What's at stake\n(OKRs under pressure)",
            'People readiness — P3 competencies assessed (85→100%), P4 MMW T01 Bronze (80→90%).\nCollective intelligence — C2 Safe-Space (70→≥80), C3 diversity (15%→improve), C4 MMW T05 (72→90%).\nManagement quality — M1 "My Manager" (78→86); Social climate S2 (58→60).\nThe "strong" numbers (Eng 76, attrition 6%) mask the forward risk — expertise walking out the door.',
          ],
          [
            'Open questions / unknowns',
            'Exactly which roles/lines carry the highest tacit-knowledge risk (role-criticality × age map)?\nWhat will the council co-own vs consult on — and where are the red lines from 2019?\nReal apprentice intake capacity and local youth pool — how fast can the pipeline be rebuilt?\nWill Sofía back knowledge-transfer investment before a crisis is visible on the dashboard?',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-2',
    title: 'CANVAS 2 · TRANSLATE HQ PRIORITIES → PLANT',
    blocks: [
      sub('① IMPACTS pillars — the strategic levers'),
      table(
        ['HQ priority (given)', 'What it means at Valterra (you write)'],
        [
          ['I-CARE', 'Behaviours known & respected but calcified — refresh ICARE as lived daily practice, not a poster (I2 76→85).'],
          ['Management quality', 'Masterful but change-averse supervisors — turn them into co-authors and coaches of renewal (M1 78→86).'],
          ['People readiness', 'The existential pillar: capture veteran know-how and rebuild the pipeline before the cliff (P3 85→100%).'],
          ['Agile P operations', 'People processes built for steady state — make them adaptive, co-designed with the union (A3 82→100%).'],
          ['Collective intelligence', 'Guarded voice + low diversity — widen safe space and start inclusive hiring (C2 70→≥80, C3 15%→improve).'],
          ['Total experience', 'People stay — and then retire en masse; make staying mean teaching the next generation.'],
          ['Social cohesion', 'Engagement 76 is real but masks risk; protect social peace by renewing, not by standing still (S1→85, S2 58→60).'],
        ],
      ),
      sub('② MWB1 · DOMF "People Focus" workstreams (WS1–6)'),
      table(
        ['Workstream (given)', 'What it means at Valterra'],
        [
          ['WS1 · ICARE for all', 'Re-earn ICARE through visible follow-through post-2019 — leaders keep small promises fully.'],
          ['WS2 · Managerial skills', 'Leader-as-coach for 20+yr supervisors; move them from authority to enabling renewal.'],
          ['WS3 · High-performing teams', 'Shift courteous resistance to genuine co-ownership; teams that author change, not absorb it.'],
          ['WS4 · Mastering competencies', 'Codify tacit craft; competency assessment + knowledge-capture across critical roles.'],
          ['WS5 · Local attractivity', 'Rebuild apprenticeship intake; partner local technical schools to court scarce youth.'],
          ['WS6 · Inclusive workforce', 'Bend the male, ageing base — inclusive hiring + a genuinely safe space to speak up.'],
        ],
      ),
      sub('③ OKR Declination · MO 2026 target numbers · ④ Priorities declined by geography / local'),
      table(
        ['HQ priority (given)', 'What it means at Valterra'],
        [
          [
            'OKR targets (Exhibit 4)',
            'Move the forward-looking KRs — P3 competencies 85→100%, C2 Safe-Space 70→≥80, C4 MMW T05 72→90%, M1 78→86 — while holding the strong ones (Eng 76, attrition 6% already met).',
          ],
          [
            'Declined by geography / local',
            'European reality: high-cost manufacturing + softening demand → plant must earn EV-era lines; strong co-determination makes the council a co-author, not a consultee; honour 2019; social peace is itself a business KPI.',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-3',
    title: 'CANVAS 3 · COVER STORY · OKR VISION — VALTERRA 2029',
    blocks: [
      table(
        ['Block', 'Model answer (Valterra)'],
        [
          [
            '① Cover — hero image + headline + key words',
            'Hero image: a retiring veteran (Manolo) and a young apprentice (Lucía) at Line 2, hands on the same machine — the pass-over of mastery.\nHeadline (past tense): "VALTERRA: THE PLANT THAT PASSED ON WHAT IT KNOWS."\nKey words: Legacy · Renewed · Together · Trust rebuilt.',
          ],
          [
            '② Big headlines (the wins)',
            'Critical knowledge captured and transferred before it retired.\nA new generation of experts and leaders — ready, and staying.\nTrust rebuilt after 2019 — commitment, not just compliance.\nThe works council co-authored the change — and carried it to the floor.',
          ],
          [
            '③ Sidebars (supporting stories)',
            'Veterans became honoured paid mentors & master-trainers.\nApprentice intake rebuilt year on year with local technical schools.\nA standing two-way forum so history stopped filling the silence.',
          ],
          [
            '④ Quotes (voices from the future)',
            '"They finally asked me to teach — and it mattered." — Manolo, veteran operator.\n"Someone had time to teach me before they left." — Lucía, apprentice.\n"This one was ours, not Clermont\'s — so we carried it." — Works-council leader.',
          ],
          [
            '⑤ OKRs this future delivers',
            'Knowledge-transfer coverage 0→60% (critical roles) · P3 competencies 85→100%.\nSafe-Space C2 70→≥80 · MMW T05 72→90% · "My Manager" M1 78→86.\nEngagement sustained 76→85 · diversity 15%→improving · social peace held.',
          ],
          [
            '⑥ Why this matters to me',
            'We will not let eighteen years of mastery walk out the door — we pass it on.\nAnd we prove, by keeping our word, that this time is genuinely different.',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-4',
    title: 'CANVAS 4 · 7S GAP — AS-IS → TO-BE → GAP → REMEDY → OKR',
    blocks: [
      table(
        ["7 S's", 'AS-IS', 'TO-BE', 'GAP', 'REMEDY', 'OKR'],
        [
          ['Strategy', 'People work centred on social dialogue & stability; not driving renewal.', 'SP leading proactive workforce renewal across the cliff.', 'From peace-keeping to transformation leadership.', '3-yr P-Roadmap co-owned with council; reframe renewal as the safe path to competitiveness.', 'S1·S2'],
          ['Structure', 'Mature SP strong in labour relations; light on workforce development.', 'SP adds a strategic workforce-development & succession capability.', 'Missing pipeline / change-leadership muscle.', 'Stand up succession + knowledge-transfer function; add change-leadership skills to SP.', 'M3·P4'],
          ['Systems', 'Stable, steady-state processes; thin knowledge-transfer; plateaued maturity.', 'Systematic knowledge-capture + rebuilt apprenticeship pipeline.', 'No systematic veteran→junior transfer.', 'Knowledge-capture tool; mentor pairing; MMW maturity restart (T01/T05).', 'P3·P4·C4'],
          ['Style', 'Compliance — "I\'ll do what\'s asked"; courteous resistance; change-fatigued.', 'Commitment — leaders tell their teams it\'s different, and mean it.', 'Belief withheld until earned.', 'Deliver one visible promise fully; leaders keep small commitments; involve early.', 'M1·C2'],
          ['Staff', 'Ageing, skilled, loyal; ~⅓ near retirement; thin pipeline; change-averse supervisors.', 'Knowledge captured; successors identified; supervisors as coaches.', 'Successor pipeline vs retirement wave.', 'Age/role-criticality map; succession plan; leader-as-coach for supervisors.', 'P3·M1'],
          ['Skills', 'Outstanding craft; light on change leadership & tacit-knowledge transfer; low diversity.', 'Critical know-how codified & mentored; change capability built.', 'Mastery lives in heads, not codified.', 'Veteran master-trainers; competency assessment; skills matrix; inclusive hiring.', 'P3·C3'],
          ['Shared Values', 'Deep pride; "transformation" = past loss; trust dented since 2019.', 'Pride harnessed to renewal; trust rebuilt through follow-through.', 'Trust debt from 2019.', 'Acknowledge 2019 openly; honour veterans; visible, kept promises; council as co-author.', 'C2·S1'],
        ],
      ),
    ],
  },
  {
    id: 'canvas-5',
    title: 'CANVAS 5 · PRIORITISE · OPPORTUNITY CANVAS',
    blocks: [
      text('Brainstormed ideas scored: Attractiveness (1–5) × Organizational Fit (Poor / Partial / Good)'),
      table(
        ['#', 'Idea', 'Attr (1–5)', 'Org fit', 'Zone'],
        [
          ['1', 'Veteran → next-gen knowledge-capture & mentoring (paid master-trainers)', '5', 'Good', '★ Core Growth'],
          ['2', 'Leadership & expert succession / pipeline plan', '5', 'Partial', '★ Big Bet'],
          ['3', 'Rebuild apprenticeship pipeline with local technical schools', '4', 'Partial', '★ Big Bet'],
          ['4', 'Trust-rebuilding "kept-promise" quick wins (post-2019)', '4', 'Good', '★ Core Growth'],
          ['5', 'Council as co-author — joint design forum from day one', '5', 'Good', '★ Core Growth'],
          ['6', 'Leader-as-coach programme for 20+yr supervisors', '4', 'Partial', 'Big Bet'],
          ['7', 'Inclusive hiring + safe-space widening (diversity)', '3', 'Partial', 'Watch'],
          ['8', 'Co-design modernised ways of working with the union', '4', 'Poor', 'Defer to Y2'],
        ],
      ),
      sub('Carry forward — the moves'),
      table(
        ['Carry forward', 'The moves'],
        [
          ['Big Bets (high · partial fit — build capability first)', '#2 Succession pipeline · #3 Rebuild apprenticeship · #6 Leader-as-coach.'],
          ['Core Growth (high · good fit — do now)', '#1 Knowledge-capture & mentoring · #4 Kept-promise quick wins · #5 Council as co-author.'],
          ['Top 2–3 into the roadmap', '(1) Knowledge-capture & mentoring · (2) Succession/pipeline · (3) Council co-authorship + trust wins.'],
        ],
      ),
    ],
  },
  {
    id: 'canvas-6',
    title: 'CANVAS 6 · FIVE BOLD STEPS · 3-YEAR P-ROADMAP',
    blocks: [
      sub('① Vision'),
      text(
        'Valterra 2029: "A plant whose knowledge and pride outlive any one generation — renewed without breaking faith with its people."',
      ),
      sub('② Essential theme · ③ How it shows up at Valterra'),
      table(
        ['Essential theme (1–2 words)', 'How it shows up at Valterra'],
        [
          ['Legacy', 'Veterans become honoured teachers; their know-how is captured before it retires.'],
          ['Renewal', 'A rebuilt pipeline and succession bench staff the EV-era future.'],
          ['Trust', '2019 acknowledged; promises kept fully; the council co-authors the change.'],
          ['Adaptivity', 'Compliance turns to commitment; a change-averse culture learns to author change.'],
          ['Belonging', 'A safer, more inclusive space; a prouder, more diverse plant.'],
        ],
      ),
      sub('The 5 bold steps'),
      table(
        ['#', 'Bold step', 'OKR link', 'Years'],
        [
          ['1', 'Knowledge capture & mentoring — veterans → next gen (paid master-trainers)', 'P3·C4', 'Y1→Y3'],
          ['2', 'Leadership & expert pipeline / succession', 'M1·P4', 'Y1→Y3'],
          ['3', 'Rebuild trust — honour 2019, deliver visibly; council as co-author', 'S1·C2', 'Y1→Y2'],
          ['4', 'Renew engagement — from compliance to commitment', 'C2·M1', 'Y1→Y3'],
          ['5', 'Modernise ways of working with the union; rebuild local attractivity', 'A3·C3', 'Y2→Y3'],
        ],
      ),
      table(
        ['Supports', 'Challenges', 'Key values'],
        [
          [
            'Deep pride & craft identity\nCouncil can carry change to floor\nSister-plant proof it works\nGenuine desire for plant survival',
            '2019 memory & withheld belief\nTime vs production for mentoring\nSpeed itself kills credibility\nChange-averse supervisors',
            'Respect · Legacy · Honesty\nPatience · Co-authorship\nFairness (no one loses)\nICARE lived, not posted',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-7',
    title: 'CANVAS 7 · PEOPLE ROADMAP — 6 MWB1 LANES × 3 YEARS',
    blocks: [
      text('Strategic Activity + OKR per lane/year. Every lane converges on the plant vision.'),
      table(
        ['Lane (MWB1)', 'Year 1', 'Year 2', 'Year 3 → plant vision'],
        [
          [
            'ICARE for all',
            'Kept-promise quick wins; ICARE daily-practice reset with supervisors\nOKR: I2 76→79',
            'ICARE Talks per shift; recognition rituals for teaching\nOKR: I2→82',
            'Sustainable ICARE culture — lived, not posted\nOKR: I2→85',
          ],
          [
            'Managerial skills',
            'Leader-as-coach launch for section heads; co-author forums\nOKR: M1 78→81',
            'Good-to-Great manager; mentoring pairs for supervisors\nOKR: M3 80→83',
            'Every supervisor a coach of renewal\nOKR: M1→86',
          ],
          [
            'Mastering competencies',
            'Map critical knowledge; competency assessment restart; capture tool\nOKR: P3 85→92%',
            'Veteran master-trainer programme; skills matrix; MMW T01/T05\nOKR: P3→97%',
            'Critical know-how codified & continuously transferred\nOKR: P3→100%',
          ],
          [
            'High-performing teams',
            'Standing two-way forum; problem-solving squads co-owned\nOKR: C2 70→74',
            'Team huddles; embed co-authorship of change\nOKR: C2→77',
            'Teams that author change, not absorb it\nOKR: C2→≥80',
          ],
          [
            'Local attractivity',
            'Restart apprentice intake; local technical-school partnerships\nOKR: P4 80→84%',
            'Structured onboarding + veteran pairing for new hires\nOKR: P4→87%',
            'Employer of choice for regional youth\nOKR: P4→90%',
          ],
          [
            'Inclusive workforce',
            'Inclusive-hiring pilot; safe-space listening with council\nOKR: C3 15%→16%',
            'Inclusion charter; widen pipeline into ops\nOKR: C4 72→82%',
            'A prouder, more diverse, safer plant\nOKR: C4→90%',
          ],
        ],
      ),
    ],
  },
  {
    id: 'canvas-8',
    title: 'CANVAS 8 · GAME PLAN · YEAR 1 — THE SIX STREAMS',
    blocks: [
      table(
        ['Stream', 'Success factors', 'Month-by-month activities', 'Challenges', 'Year-1 target'],
        [
          [
            'ICARE for all',
            'Leaders keep small promises fully · Recognition for teaching · Visible follow-through',
            'M1–2: Pick & commit 3 "kept promises"\nM3–4: Deliver promise #1 fully\nM5–6: ICARE daily-practice reset\nM7–8: Recognition ritual for mentors\nM9–10: Pulse check on trust\nM11–12: Publish what changed',
            'Scepticism from broken promises · Symbolism seen as spin',
            'ICARE I2 76→79 · one visible promise delivered',
          ],
          [
            'Managerial skills',
            'Honest manager buy-in · Protected coaching time · Co-authorship not mandate',
            'M1–2: Enrol section heads; frame the why\nM3–4: Leader-as-coach module 1\nM5–6: Co-author design forums\nM7–8: Weekly 1:1 habit\nM9–10: Coaching practice on the floor\nM11–12: Manager forum + review',
            'Supervisors privately sceptical · "I\'ve seen six of these"',
            '"My Manager" M1 78→81 · leader-as-coach live',
          ],
          [
            'Mastering competencies',
            'Age/role-criticality data · Mentor recognition & time · Simple capture tool',
            'M1–2: Map critical knowledge & at-risk roles\nM3–4: Competency assessment restart\nM5–6: Launch veteran→junior pairs\nM7–8: Knowledge-capture tool live\nM9–10: Codify first critical roles\nM11–12: Coverage review',
            'Veterans wary of "being replaced" · Time vs production',
            'Knowledge-transfer coverage 0→60% · P3 85→92%',
          ],
          [
            'High-performing teams',
            'Genuine voice, not theatre · Council inside the design · Small, protected changes',
            'M1–2: Stand up two-way forum\nM3–4: Council co-design charter\nM5–6: Problem-solving squads\nM7–8: Pilot one co-owned change\nM9–10: Gather & act on voice\nM11–12: Share wins on every shift',
            'Courteous resistance stalls change · Change fatigue among stayers',
            'Safe-Space C2 70→74 · forum running',
          ],
          [
            'Local attractivity',
            'Rebuilt intake plan · School partnerships · Structured onboarding',
            'M1–2: Scope apprentice intake & pool\nM3–4: Partner local technical schools\nM5–6: Recruit first cohort\nM7–8: Pair apprentices with veterans\nM9–10: Onboarding & belonging\nM11–12: Retention & pipeline review',
            'Limited, courted local youth pool · Slow pipeline pay-off',
            'MMW T01 P4 80→84% · first apprentice cohort in',
          ],
          [
            'Inclusive workforce',
            'Council partnership on fairness · Safe space to speak up · Honest diversity baseline',
            'M1–2: Baseline diversity & safe-space\nM3–4: Inclusive-hiring pilot design\nM5–6: Listening sessions w/ council\nM7–8: First inclusive hires\nM9–10: Draft inclusion charter\nM11–12: Review & set Y2 targets',
            'Ageing, male ops base · Guarded post-2019 voice',
            'Diversity 15%→16% · safe-space listening live',
          ],
        ],
      ),
      sub('Team you need · Resources you need'),
      table(
        ['Team you need', 'Resources you need'],
        [
          [
            'Site SP lead (Elena) as sponsor\nPlant experts / veterans as master-trainers\nLine managers & section heads\nWorks-council & union reps as co-authors\nA succession sponsor from the leadership team',
            'Knowledge-capture tool & simple templates\nMentor time protected + recognition budget\nTalent-review / succession process\nA "trust quick-win" budget for kept promises\nLocal technical-school partnerships',
          ],
        ],
      ),
    ],
  },
];

const CASE_C_DAY2: CanvasSection[] = [
  {
    id: 'canvas-9',
    title: 'CANVAS 9 · PROGRESS PLAN — OVERVIEW + DELIVERABLES & TIMELINE',
    blocks: [
      sub('Overview'),
      table(
        ['Field', 'Model answer (Valterra)'],
        [
          ['PP Title', 'Valterra People Progress Plan 2026 — "Pass It On": capture veteran expertise & rebuild the pipeline.'],
          [
            'Purpose',
            'Turn the Year-1 Game Plan into a resourced, tracked plan that captures critical veteran knowledge, stands up succession, and rebuilds trust — moving the forward-looking OKRs without disturbing social peace.',
          ],
        ],
      ),
      sub('Indicators'),
      table(
        ['Indicator', 'Definition', 'Target'],
        [
          ['Knowledge-transfer coverage', '% of critical roles with a captured/mentored successor', '0 → 60%'],
          ['Competencies assessed', '% job competencies assessed after qualification (P3)', '85% → 92% (Y1); 100% (Y3)'],
          ['Safe-Space score', 'MFT Safe-Space / speak-up score (C2)', '70 → 74 (Y1); ≥80 (Y3)'],
        ],
      ),
      sub('What success looks like (max 3) · Key conditions of success (max 3)'),
      table(
        ['What success looks like', 'Key conditions of success'],
        [
          [
            'Veterans are honoured teachers, not wary defenders — know-how is being captured.\nThe council co-owns the change and carries it to the floor.\nCompliance has turned to commitment — supervisors tell their teams it\'s different.',
            'Council brought inside the design early — not consulted at the end.\nOne visible promise delivered fully — proof this is not 2019.\nPatience & protected mentor time — speed is what kills credibility here.',
          ],
        ],
      ),
      sub('Deliverables & timeline'),
      table(
        ['N°', 'Deliverable', 'Responsible', 'Start → Due', 'Status'],
        [
          ['1', 'Critical-knowledge & at-risk-role map (age × role criticality)', 'SP lead + line mgrs', 'M1 → M2', 'In progress'],
          ['2', 'Council co-design charter — roadmap co-authorship', 'SP lead + council', 'M1 → M3', 'In progress'],
          ['3', 'Competency-assessment restart (P3)', 'SP + section heads', 'M2 → M6', 'Planned'],
          ['4', 'Veteran master-trainer & mentoring programme', 'SP + veteran mentors', 'M3 → M9', 'Planned'],
          ['5', 'Knowledge-capture tool & templates live', 'SP + IT', 'M4 → M7', 'Planned'],
          ['6', 'Leader-as-coach programme for supervisors', 'SP + L&D', 'M2 → M8', 'Planned'],
          ['7', 'Apprentice intake + local school partnerships', 'SP + recruiting', 'M2 → M10', 'Planned'],
          ['8', 'Standing two-way forum + one "kept promise" delivered', 'SP lead + director', 'M1 → M6', 'In progress'],
        ],
      ),
    ],
  },
];

export const ELEVATE_CASE_C: ElevateCaseContent = {
  intro: CASE_C_INTRO,
  day1Sections: CASE_C_DAY1,
  day2Sections: CASE_C_DAY2,
};
