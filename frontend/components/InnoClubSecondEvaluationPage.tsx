import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type VoteOption = {
  id: string;
  label: string;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number | null;
};

type VoteCategoryId = 'best_storytelling' | 'most_creative_product_launch' | 'most_market_impact';

type VoteResultBucket = { total: number; counts: Record<string, number> };
type VoteResults = Partial<Record<VoteCategoryId, VoteResultBucket>>;

type EvaluationFormState = {
  facilitator_score: number;
  facilitator_comment: string;
  content_score: number;
  content_comment: string;
  overall_score: number;
  atmosphere_score: number;
  sharing_score: number;
  overall_comment: string;
};

type VoteRow = {
  best_storytelling_option_id: string | null;
  most_creative_product_launch_option_id: string | null;
  most_market_impact_option_id: string | null;
};

const REFLECTION_QUESTIONS = [
  {
    id: 'key_message_learning',
    title:
      'จากการได้รับโจทย์สินค้าและออกแบบ Storytelling คุณได้เรียนรู้อะไรเกี่ยวกับการสื่อสารคุณค่าของสินค้าให้กลุ่มเป้าหมายโดยเน้นเรื่องของการสื่อ Key Messege มากกว่าทำ Production ที่สวยงาม',
  },
  {
    id: 'team_challenge',
    title:
      'ในกระบวนการสร้าง Stop Motion และ AI Video อะไรคือความท้าทายสำคัญของทีม และทีมของคุณจัดการกับความท้าทายนั้นอย่างไร?',
  },
  {
    id: 'real_work_application',
    title:
      'จากกิจกรรมในวันนี้ มีแนวคิด เครื่องมือ หรือวิธีการใดที่คุณคิดว่าสามารถนำไปประยุกต์ หรือเป็นปัจจัยสำคัญในการชวนคิดกับการใช้กับงานจริงของคุณได้ทันที?',
  },
] as const;

const VOTE_CATEGORIES: { id: VoteCategoryId; title: string; description: string }[] = [
  {
    id: 'best_storytelling',
    title: 'Best Storytelling Award',
    description: 'เล่าเรื่องได้ดีที่สุด',
  },
  {
    id: 'most_creative_product_launch',
    title: 'Most Creative Product Launch Award',
    description: 'เล่าเรื่องได้สร้างสรรค์สุดๆ',
  },
  {
    id: 'most_market_impact',
    title: 'Most Market Impact Award',
    description: 'สื่อสารสินค้าได้ตรงใจที่สุด',
  },
];

const VOTE_RESULT_COLUMNS: Record<VoteCategoryId, keyof VoteRow> = {
  best_storytelling: 'best_storytelling_option_id',
  most_creative_product_launch: 'most_creative_product_launch_option_id',
  most_market_impact: 'most_market_impact_option_id',
};

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const THEATER_PAGE_CLASS =
  'min-h-screen bg-transparent text-white flex flex-col selection:bg-yellow-300 selection:text-black innoclub-angsana';

const INNOCLUB_SECOND_BACKGROUND_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/PTT%20Group%20Innoclub/Background%20PTT%20Group.png';

function TheaterBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${INNOCLUB_SECOND_BACKGROUND_URL}")` }}
      />
    </div>
  );
}

function EventTitle({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="relative text-center">
      <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.32em] text-yellow-100/80">{eyebrow}</p>
      <h1 className="mt-3 text-4xl sm:text-6xl lg:text-7xl font-black leading-none text-[#fff3cf] drop-shadow-[0_5px_0_rgba(63,18,5,0.75)]">
        PTT GROUP INNO CLUB
      </h1>
      <p className="mt-2 font-serif text-3xl sm:text-5xl italic font-bold text-[#ffe6a6] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
        Innovation In Motion
      </p>
    </div>
  );
}

const InnoClubSecondEvaluationPage: React.FC = () => {
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormState>({
    facilitator_score: 0,
    facilitator_comment: '',
    content_score: 0,
    content_comment: '',
    overall_score: 0,
    atmosphere_score: 0,
    sharing_score: 0,
    overall_comment: '',
  });
  const [answers, setAnswers] = useState<Record<string, string>>({
    key_message_learning: '',
    team_challenge: '',
    real_work_application: '',
  });
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [votes, setVotes] = useState<Record<VoteCategoryId, string>>({
    best_storytelling: '',
    most_creative_product_launch: '',
    most_market_impact: '',
  });
  const [activeVoteIndex, setActiveVoteIndex] = useState(0);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [voteResults, setVoteResults] = useState<VoteResults>({});
  const [error, setError] = useState<string | null>(null);
  const voteCategoryRef = useRef<HTMLElement | null>(null);
  const voteActionsRef = useRef<HTMLDivElement | null>(null);
  const voteHeaderRef = useRef<HTMLElement | null>(null);
  const pendingVoteCategoryScrollRef = useRef(false);

  const answeredCount = useMemo(
    () => REFLECTION_QUESTIONS.filter((q) => answers[q.id].trim().length > 0).length,
    [answers]
  );
  const requiredScores = [
    evaluationForm.facilitator_score,
    evaluationForm.content_score,
    evaluationForm.overall_score,
    evaluationForm.atmosphere_score,
    evaluationForm.sharing_score,
  ];
  const answeredRequiredScoreCount = requiredScores.filter((score) => score >= 1 && score <= 5).length;
  const requiredQuestionCount = REFLECTION_QUESTIONS.length + requiredScores.length;
  const answeredQuestionCount = answeredCount + answeredRequiredScoreCount;
  const canSubmitReflection =
    answeredCount === REFLECTION_QUESTIONS.length && answeredRequiredScoreCount === requiredScores.length;
  const canSubmitVote = VOTE_CATEGORIES.every((category) => votes[category.id]);
  const activeVoteCategory = VOTE_CATEGORIES[activeVoteIndex];
  const activeVoteSelected = Boolean(votes[activeVoteCategory.id]);
  const isLastVoteCategory = activeVoteIndex === VOTE_CATEGORIES.length - 1;

  const getVoteResult = (categoryId: VoteCategoryId, optionId: string) => {
    const categoryResult = voteResults[categoryId];
    const total = categoryResult?.total ?? 0;
    const count = categoryResult?.counts[optionId] ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, total, percent };
  };

  const scrollToTop = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const scrollToElement = (
    element: HTMLElement | null,
    block: ScrollLogicalPosition = 'start',
    duration = 850
  ) => {
    window.requestAnimationFrame(() => {
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const startY = window.scrollY;
      const rawTargetY =
        block === 'center'
          ? startY + rect.top - (window.innerHeight - rect.height) / 2
          : startY + rect.top - 18;
      const targetY = Math.max(0, rawTargetY);
      const distance = targetY - startY;
      const startTime = performance.now();

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        window.scrollTo(0, startY + distance * easedProgress);

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
    });
  };

  useEffect(() => {
    if (!reflectionSubmitted || !isSupabaseConfigured) return;
    setLoadingOptions(true);
    setError(null);
    supabase
      .from('innoclub_second_vote_options')
      .select('id, label, image_url, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true })
      .then(({ data, error: loadError }) => {
        setLoadingOptions(false);
        if (loadError) {
          setError(loadError.message);
          setVoteOptions([]);
          return;
        }
        setVoteOptions((data as VoteOption[]) || []);
      });
  }, [reflectionSubmitted]);

  useEffect(() => {
    if (!pendingVoteCategoryScrollRef.current) return;
    pendingVoteCategoryScrollRef.current = false;
    scrollToElement(voteCategoryRef.current, 'start', 850);
  }, [activeVoteIndex]);

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const setScore = (
    key: Extract<keyof EvaluationFormState, 'facilitator_score' | 'content_score' | 'overall_score' | 'atmosphere_score' | 'sharing_score'>,
    value: number
  ) => {
    setEvaluationForm((prev) => ({ ...prev, [key]: value }));
  };

  const setText = (
    key: Extract<keyof EvaluationFormState, 'facilitator_comment' | 'content_comment' | 'overall_comment'>,
    value: string
  ) => {
    setEvaluationForm((prev) => ({ ...prev, [key]: value }));
  };

  const renderScoreGroup = (
    field: Extract<keyof EvaluationFormState, 'facilitator_score' | 'content_score' | 'overall_score' | 'atmosphere_score' | 'sharing_score'>,
    name: string
  ) => (
    <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-3">
      {SCORE_OPTIONS.map((score) => {
        const selected = evaluationForm[field] === score;
        return (
          <label
            key={score}
            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-2 py-2 transition-all sm:min-h-[50px] sm:min-w-[52px] ${
              selected
                ? 'border-yellow-200 bg-yellow-200/20 text-yellow-50 shadow-[0_0_0_1px_rgba(254,240,138,0.38),0_0_18px_rgba(250,204,21,0.18)]'
                : 'border-yellow-100/15 bg-black/30 text-yellow-100/75 hover:border-yellow-200/45'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => setScore(field, score)}
              className="sr-only"
              aria-label={`${name}-${score}`}
            />
            <span className="text-base font-black">{score}</span>
          </label>
        );
      })}
    </div>
  );

  const createEmptyVoteResults = (): Record<VoteCategoryId, VoteResultBucket> => ({
    best_storytelling: { total: 0, counts: {} },
    most_creative_product_launch: { total: 0, counts: {} },
    most_market_impact: { total: 0, counts: {} },
  });

  const applyFallbackVotes = (
    results: Record<VoteCategoryId, VoteResultBucket>,
    fallbackVotes?: Record<VoteCategoryId, string>
  ) => {
    if (!fallbackVotes) return;

    VOTE_CATEGORIES.forEach((category) => {
      const optionId = fallbackVotes[category.id];
      if (!optionId || results[category.id].counts[optionId]) return;
      results[category.id].total += 1;
      results[category.id].counts[optionId] = 1;
    });
  };

  const getOptionLabel = (optionId: string) => {
    return voteOptions.find((option) => option.id === optionId)?.label || '';
  };

  const saveVoteDataSnapshot = async (results: Record<VoteCategoryId, VoteResultBucket>) => {
    const submissionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const selectedVotes = VOTE_CATEGORIES.reduce<Record<string, unknown>>((summary, category) => {
      const optionId = votes[category.id];
      summary[category.id] = {
        category_title: category.title,
        category_description: category.description,
        option_id: optionId,
        team_name: getOptionLabel(optionId),
      };
      return summary;
    }, {});

    const selectedPayload = {
      submission_id: submissionId,
      selected_votes: selectedVotes,
      best_storytelling_option_id: votes.best_storytelling,
      best_storytelling_team_name: getOptionLabel(votes.best_storytelling),
      most_creative_product_launch_option_id: votes.most_creative_product_launch,
      most_creative_product_launch_team_name: getOptionLabel(votes.most_creative_product_launch),
      most_market_impact_option_id: votes.most_market_impact,
      most_market_impact_team_name: getOptionLabel(votes.most_market_impact),
    };

    const { error: submissionSnapshotError } = await supabase
      .from('innoclub_second_vote_submissions')
      .insert(selectedPayload);

    if (submissionSnapshotError) {
      console.warn('Cannot save InnoClub vote submission snapshot', submissionSnapshotError.message);
    }

    const resultRows = VOTE_CATEGORIES.flatMap((category) => {
      const categoryResult = results[category.id];
      return [...voteOptions]
        .sort((a, b) => {
          const countA = categoryResult.counts[a.id] || 0;
          const countB = categoryResult.counts[b.id] || 0;
          if (countB !== countA) return countB - countA;
          return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
        })
        .map((option, index) => {
          const voteCount = categoryResult.counts[option.id] || 0;
          return {
            submission_id: submissionId,
            category_id: category.id,
            category_title: category.title,
            category_description: category.description,
            option_id: option.id,
            team_name: option.label,
            vote_count: voteCount,
            total_votes: categoryResult.total,
            vote_percent: categoryResult.total > 0 ? Math.round((voteCount / categoryResult.total) * 100) : 0,
            rank: index + 1,
          };
        });
    });

    const { error: resultSnapshotError } = await supabase
      .from('innoclub_second_vote_result_snapshots')
      .insert(resultRows);

    if (resultSnapshotError) {
      console.warn('Cannot save InnoClub vote result snapshot', resultSnapshotError.message);
    }
  };

  const loadVoteResults = async (fallbackVotes?: Record<VoteCategoryId, string>) => {
    const { data, error: loadError } = await supabase
      .from('innoclub_second_votes')
      .select('best_storytelling_option_id, most_creative_product_launch_option_id, most_market_impact_option_id');

    if (loadError) {
      setError(loadError.message);
      const fallbackResults = createEmptyVoteResults();
      applyFallbackVotes(fallbackResults, fallbackVotes);
      setVoteResults(fallbackResults);
      return fallbackVotes ? fallbackResults : null;
    }

    const nextResults = createEmptyVoteResults();

    ((data as VoteRow[]) || []).forEach((row) => {
      VOTE_CATEGORIES.forEach((category) => {
        const optionId = row[VOTE_RESULT_COLUMNS[category.id]];
        if (!optionId) return;
        nextResults[category.id].total += 1;
        nextResults[category.id].counts[optionId] = (nextResults[category.id].counts[optionId] || 0) + 1;
      });
    });

    applyFallbackVotes(nextResults, fallbackVotes);

    setVoteResults(nextResults);
    return nextResults;
  };

  const handleReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmitReflection) {
      setError('กรุณาให้คะแนนข้อบังคับ 5 ข้อ และตอบคำถามปลายเปิดให้ครบทั้ง 3 ข้อ');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    setSubmittingReflection(true);
    const { error: submitError } = await supabase.from('innoclub_second_reflections').insert({
      facilitator_score: evaluationForm.facilitator_score,
      facilitator_comment: evaluationForm.facilitator_comment || null,
      content_score: evaluationForm.content_score,
      content_comment: evaluationForm.content_comment || null,
      overall_score: evaluationForm.overall_score,
      atmosphere_score: evaluationForm.atmosphere_score,
      sharing_score: evaluationForm.sharing_score,
      overall_comment: evaluationForm.overall_comment || null,
      key_message_learning: answers.key_message_learning.trim(),
      team_challenge: answers.team_challenge.trim(),
      real_work_application: answers.real_work_application.trim(),
    });
    setSubmittingReflection(false);
    if (submitError) {
      setError(submitError.message);
      return;
    }
    setReflectionSubmitted(true);
    setShowVotePrompt(true);
  };

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmitVote) {
      setError('กรุณาโหวตให้ครบทั้ง 3 รางวัล');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    setSubmittingVote(true);
    const { error: submitError } = await supabase.from('innoclub_second_votes').insert({
      best_storytelling_option_id: votes.best_storytelling,
      most_creative_product_launch_option_id: votes.most_creative_product_launch,
      most_market_impact_option_id: votes.most_market_impact,
    });
    if (submitError) {
      setSubmittingVote(false);
      setError(submitError.message);
      return;
    }
    const nextResults = await loadVoteResults(votes);
    if (nextResults) {
      await saveVoteDataSnapshot(nextResults);
    }
    setSubmittingVote(false);
    setVoteSubmitted(true);
    scrollToElement(voteHeaderRef.current, 'start', 850);
  };

  const selectVoteOption = (categoryId: VoteCategoryId, optionId: string) => {
    setVotes((prev) => ({ ...prev, [categoryId]: optionId }));
    scrollToElement(voteActionsRef.current, 'center', 950);
  };

  const goToNextVoteCategory = () => {
    setError(null);
    if (!activeVoteSelected) {
      setError('กรุณาเลือก 1 ทีมก่อนจึงจะไปยังรางวัลถัดไป');
      return;
    }
    pendingVoteCategoryScrollRef.current = true;
    setActiveVoteIndex((prev) => Math.min(prev + 1, VOTE_CATEGORIES.length - 1));
  };

  const goToPreviousVoteCategory = () => {
    setError(null);
    pendingVoteCategoryScrollRef.current = true;
    setActiveVoteIndex((prev) => Math.max(prev - 1, 0));
  };

  const renderHeader = () => (
    <header className="relative z-10 border-b border-yellow-200/20 bg-black/35 px-4 py-4 sm:px-6 xl:px-10 backdrop-blur">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 text-yellow-100/75 hover:text-yellow-100 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          หน้าหลัก
        </Link>
        <div className="flex items-center gap-2 rounded-xl border border-yellow-200/25 bg-[#160503]/80 px-3 py-2 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-200 to-amber-500 rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-sm">PTT</span>
          </div>
          <span className="font-black tracking-tight text-sm text-yellow-100">INNO CLUB</span>
        </div>
      </div>
    </header>
  );

  return (
    <div className={THEATER_PAGE_CLASS}>
      <TheaterBackdrop />
      {renderHeader()}

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 xl:px-10 py-8 sm:py-14">
        <section className="relative mb-7 overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(180deg,rgba(24,5,3,0.82),rgba(8,2,1,0.92))] p-5 sm:p-9 shadow-[0_24px_90px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-[repeating-linear-gradient(90deg,rgba(255,240,190,0.8)_0_9px,transparent_9px_20px)] opacity-70" />
          <EventTitle eyebrow={reflectionSubmitted ? 'Stop Motion & AI Video Creation Vote' : 'Post-Activity Reflection Questions'} />
          <p className="mx-auto mt-6 max-w-2xl text-center text-yellow-50/80 text-sm sm:text-base leading-relaxed">
            ตอบคำถามวัดผลจากกิจกรรม innovation in motion
          </p>
        </section>

        {error && (
          <div className="mb-5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!reflectionSubmitted && (
          <>
            <div className="mb-6 rounded-2xl border border-yellow-200/25 bg-black/45 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between text-sm">
                <p className="text-yellow-100 font-bold">ความคืบหน้าแบบประเมิน</p>
                <p className="text-white font-medium">
                  {answeredQuestionCount}/{requiredQuestionCount} <span className="text-gray-400">ข้อ</span>
                </p>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden border border-yellow-200/10">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-yellow-200 to-amber-500 transition-all shadow-[0_0_18px_rgba(250,204,21,0.48)]"
                  style={{ width: `${(answeredQuestionCount / requiredQuestionCount) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleReflectionSubmit} className="space-y-6">
              <section className="rounded-[1.75rem] border border-yellow-200/20 bg-[linear-gradient(145deg,rgba(38,7,5,0.88),rgba(10,2,1,0.88))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)] sm:p-7">
                <h2 className="mb-7 text-xl font-black text-yellow-300 sm:text-2xl">Facilitator</h2>
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-base font-bold leading-relaxed text-yellow-50 sm:text-xl">
                      1. ความพึงพอใจโดยรวมต่อ Facilitator *
                    </p>
                    {renderScoreGroup('facilitator_score', 'facilitator_score')}
                  </div>
                  <div>
                    <label htmlFor="facilitator_comment" className="mb-3 block text-sm font-bold text-yellow-100/65">
                      2. ข้อเสนอแนะ
                    </label>
                    <textarea
                      id="facilitator_comment"
                      value={evaluationForm.facilitator_comment}
                      onChange={(e) => setText('facilitator_comment', e.target.value)}
                      rows={3}
                      placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                      className="w-full resize-none rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-base text-yellow-50 placeholder-yellow-100/35 focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-yellow-200/20 bg-[linear-gradient(145deg,rgba(38,7,5,0.88),rgba(10,2,1,0.88))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)] sm:p-7">
                <h2 className="mb-7 text-xl font-black text-yellow-300 sm:text-2xl">เนื้อหาของ PTT GROUP INNO Club</h2>
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-base font-bold leading-relaxed text-yellow-50 sm:text-xl">
                      1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *
                    </p>
                    {renderScoreGroup('content_score', 'content_score')}
                  </div>
                  <div>
                    <label htmlFor="content_comment" className="mb-3 block text-sm font-bold text-yellow-100/65">
                      2. ข้อเสนอแนะ
                    </label>
                    <textarea
                      id="content_comment"
                      value={evaluationForm.content_comment}
                      onChange={(e) => setText('content_comment', e.target.value)}
                      rows={3}
                      placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                      className="w-full resize-none rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-base text-yellow-50 placeholder-yellow-100/35 focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-yellow-200/20 bg-[linear-gradient(145deg,rgba(38,7,5,0.88),rgba(10,2,1,0.88))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)] sm:p-7">
                <h2 className="mb-7 text-xl font-black leading-relaxed text-yellow-300 sm:text-2xl">
                  ความพึงพอใจโดยรวมและความคิดเห็นต่อ PTT GROUP INNO Club
                </h2>
                <div className="space-y-7">
                  <div>
                    <p className="mb-3 text-base font-bold leading-relaxed text-yellow-50 sm:text-xl">
                      1. ความพึงพอใจโดยรวมต่อ PTT GROUP INNO Club *
                    </p>
                    {renderScoreGroup('overall_score', 'overall_score')}
                  </div>
                  <div>
                    <p className="mb-3 text-base font-bold leading-relaxed text-yellow-50 sm:text-xl">
                      2. ท่านเห็นบรรยากาศ PTT GROUP INNO Club ครั้งนี้ ส่งเสริมให้ทุกคนกล้าแสดงความคิดเห็น และสร้างการมีส่วนร่วมมากน้อยเพียงใด *
                    </p>
                    {renderScoreGroup('atmosphere_score', 'atmosphere_score')}
                  </div>
                  <div>
                    <p className="mb-3 text-base font-bold leading-relaxed text-yellow-50 sm:text-xl">
                      3. PTT GROUP INNO Club ครั้งนี้ มีการแบ่งปัน แลกเปลี่ยนข้อมูลระหว่างกันมากน้อยเพียงใด *
                    </p>
                    {renderScoreGroup('sharing_score', 'sharing_score')}
                  </div>
                  <div>
                    <label htmlFor="overall_comment" className="mb-3 block text-sm font-bold text-yellow-100/65">
                      4. ข้อเสนอแนะเพิ่มเติม
                    </label>
                    <textarea
                      id="overall_comment"
                      value={evaluationForm.overall_comment}
                      onChange={(e) => setText('overall_comment', e.target.value)}
                      rows={3}
                      placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                      className="w-full resize-none rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-base text-yellow-50 placeholder-yellow-100/35 focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              {REFLECTION_QUESTIONS.map((question, index) => (
                <section
                  key={question.id}
                  className="rounded-[1.75rem] border border-yellow-200/20 bg-[linear-gradient(145deg,rgba(38,7,5,0.88),rgba(10,2,1,0.88))] p-4 sm:p-7 shadow-[0_18px_50px_rgba(0,0,0,0.38)]"
                >
                  <label htmlFor={question.id} className="block text-yellow-50 font-bold text-base sm:text-xl leading-relaxed mb-3">
                    {index + 1}. {question.title} *
                  </label>
                  <textarea
                    id={question.id}
                    value={answers[question.id]}
                    onChange={(e) => setAnswer(question.id, e.target.value)}
                    rows={5}
                    placeholder="กรุณาตอบคำถาม..."
                    className="w-full px-4 py-3 rounded-2xl bg-black/45 border border-yellow-200/20 text-yellow-50 placeholder-yellow-100/35 text-base focus:outline-none focus:border-yellow-300 resize-none"
                  />
                </section>
              ))}

              <div className="sticky bottom-0 z-20 -mx-4 border-t border-yellow-200/20 bg-[#120302]/95 px-4 pt-3 pb-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
                <button
                  type="submit"
                  disabled={submittingReflection || !canSubmitReflection}
                  className="w-full sm:w-auto sm:min-w-48 px-8 py-4 rounded-full font-black text-base bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 text-black hover:from-white hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_18px_44px_rgba(250,204,21,0.26)]"
                >
                  {submittingReflection ? 'กำลังส่งคำตอบ...' : 'ส่งคำตอบ'}
                </button>
              </div>
            </form>
          </>
        )}

        {reflectionSubmitted && (
          <form onSubmit={handleVoteSubmit} className="space-y-7">
            <section
              ref={voteHeaderRef}
              className="relative overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(145deg,rgba(49,8,5,0.9),rgba(12,2,1,0.92)_52%,rgba(35,13,3,0.95))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.44)] sm:p-8"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/80 to-transparent" />
              <div className="relative">
                <div className="mx-auto mb-5 h-1.5 max-w-sm rounded-full bg-gradient-to-r from-transparent via-yellow-100 to-transparent" />
                <p className="text-center text-xs sm:text-sm font-black uppercase tracking-[0.32em] text-yellow-100/90">
                  PTT GROUP INNO CLUB · Innovation In Motion
                </p>
                <h2 className="mt-3 text-center text-3xl sm:text-5xl font-black leading-tight text-[#fff0c4] drop-shadow-[0_4px_0_rgba(56,12,3,0.8)]">
                  Stop Motion & AI Video Creation Vote
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-center text-sm sm:text-lg text-amber-50/80">
                </p>
              </div>
            </section>

            {loadingOptions ? (
              <div className="rounded-[2rem] border border-yellow-300/20 bg-black/50 p-10 text-center text-yellow-100">
                กำลังโหลดตัวเลือกโหวต...
              </div>
            ) : voteOptions.length === 0 ? (
              <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
                ยังไม่มีตัวเลือกโหวต กรุณาแจ้งผู้ดูแลให้เพิ่มรายชื่อในหน้า Admin
              </div>
            ) : (
              (voteSubmitted ? VOTE_CATEGORIES : [activeVoteCategory]).map((category, index) => (
                <section
                  key={category.id}
                  ref={voteSubmitted ? undefined : voteCategoryRef}
                  className="relative overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(145deg,rgba(49,8,5,0.9),rgba(12,2,1,0.92)_52%,rgba(35,13,3,0.95))] p-4 sm:p-7 shadow-[0_18px_60px_rgba(0,0,0,0.44)]"
                >
                  <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-yellow-100/10" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/80 to-transparent" />
                  <div className="relative mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-yellow-100/50 bg-yellow-100/15 text-2xl font-black text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.18)]">
                      {voteSubmitted ? index + 1 : activeVoteIndex + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-100/65">Award Category</p>
                      <h3 className="mt-1 text-xl sm:text-3xl font-black text-[#ffe8a8]">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-amber-50/75">{category.description}</p>
                    </div>
                  </div>
                  {!voteSubmitted && (
                    <div className="relative mb-7 rounded-[1.5rem] border border-yellow-100/20 bg-black/30 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-full border border-red-500/25 bg-red-950/35 px-4 py-2 text-sm font-bold text-yellow-100">
                          รางวัล {activeVoteIndex + 1} / {VOTE_CATEGORIES.length}
                        </div>
                        <div className="flex flex-1 items-center justify-between gap-2">
                          {VOTE_CATEGORIES.map((step, stepIndex) => {
                            const isActive = stepIndex === activeVoteIndex;
                            const isDone = Boolean(votes[step.id]);
                            return (
                              <React.Fragment key={step.id}>
                                <button
                                  type="button"
                                  onClick={() => setActiveVoteIndex(stepIndex)}
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black transition-all ${
                                    isActive
                                      ? 'border-yellow-100 bg-gradient-to-br from-yellow-100 to-amber-500 text-black shadow-[0_0_22px_rgba(250,204,21,0.36)]'
                                      : isDone
                                        ? 'border-yellow-200/50 bg-yellow-100/20 text-yellow-100'
                                        : 'border-white/20 bg-black/35 text-white/60'
                                  }`}
                                  aria-label={`ไปยังรางวัล ${stepIndex + 1}`}
                                >
                                  {stepIndex + 1}
                                </button>
                                {stepIndex < VOTE_CATEGORIES.length - 1 && (
                                  <div className={`h-0.5 flex-1 ${stepIndex < activeVoteIndex ? 'bg-yellow-300' : 'bg-white/15'}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-yellow-100/70">
                        <span>Storytelling</span>
                        <span>Product Launch</span>
                        <span>Market Impact</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`relative grid gap-x-2 gap-y-8 sm:gap-x-8 sm:gap-y-10 ${
                      voteSubmitted ? 'grid-cols-3 items-end' : 'grid-cols-1'
                    }`}
                  >
                    {(voteSubmitted
                      ? [...voteOptions].sort((a, b) => {
                          const resultA = getVoteResult(category.id, a.id);
                          const resultB = getVoteResult(category.id, b.id);
                          if (resultB.count !== resultA.count) return resultB.count - resultA.count;
                          return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
                        })
                      : voteOptions
                    ).map((option, rankIndex) => {
                      const selected = votes[category.id] === option.id;
                      const result = getVoteResult(category.id, option.id);
                      const rank = rankIndex + 1;
                      const isTopRank = voteSubmitted && rank <= 3 && result.total > 0;
                      if (!voteSubmitted) {
                        return (
                          <div
                            key={option.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectVoteOption(category.id, option.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectVoteOption(category.id, option.id);
                              }
                            }}
                            className={`group relative flex cursor-pointer items-center gap-4 rounded-[1.5rem] border p-3 text-left transition-all sm:p-4 ${
                              selected
                                ? 'border-yellow-100 bg-[radial-gradient(circle_at_0%_50%,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,rgba(91,7,5,0.95),rgba(19,4,2,0.92))] shadow-[0_0_0_1px_rgba(255,245,190,0.5),0_0_30px_rgba(250,204,21,0.24)]'
                                : 'border-yellow-100/15 bg-black/35 hover:border-yellow-100/40 hover:bg-black/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={category.id}
                              value={option.id}
                              checked={selected}
                              onChange={() => undefined}
                              className="sr-only"
                            />
                            <div className="relative h-20 w-20 shrink-0 rounded-full bg-[conic-gradient(from_0deg,#fff7c2,#facc15,#7c2d12,#fff7c2)] p-[3px] shadow-[0_0_22px_rgba(250,204,21,0.24)] sm:h-24 sm:w-24">
                              <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#4b1208] bg-black">
                                {option.image_url ? (
                                  <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(250,204,21,0.18),rgba(0,0,0,0.8))] px-2 text-center text-[10px] font-black text-yellow-100/70">
                                    เพิ่มรูปใน Admin
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-2xl font-black text-yellow-50 sm:text-3xl">{option.label}</p>
                            </div>
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
                                selected
                                  ? 'border-yellow-100 bg-gradient-to-br from-yellow-100 to-amber-500 text-black'
                                  : 'border-white/40 bg-black/20 text-white/40'
                              }`}
                            >
                              {selected ? (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : null}
                            </div>
                          </div>
                        );
                      }
                      if (rank > 3) {
                        return (
                          <div
                            key={option.id}
                            className="order-4 col-span-3 flex items-center gap-3 rounded-2xl border border-yellow-100/12 bg-black/28 px-3 py-3 text-left sm:px-4"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-black text-yellow-100/70">
                              {rank}
                            </div>
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-yellow-100/20 bg-black">
                              {option.image_url ? (
                                <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-yellow-100/45">
                                  ไม่มีรูป
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-yellow-50 sm:text-base">{option.label}</p>
                              <p className="text-[11px] font-bold text-yellow-100/50">อันดับ {rank}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-black text-yellow-100">{result.percent}%</p>
                              <p className="text-[11px] font-bold text-yellow-100/55">{result.count} คะแนนโหวต</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={option.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!voteSubmitted) selectVoteOption(category.id, option.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!voteSubmitted) selectVoteOption(category.id, option.id);
                            }
                          }}
                          className={`group relative cursor-pointer rounded-[2rem] px-2 pb-3 pt-2 text-center transition-all hover:-translate-y-1 ${
                            isTopRank && rank === 1
                              ? 'order-1 mx-auto w-full rounded-[1.5rem] bg-yellow-100/10 py-3 shadow-[0_0_54px_rgba(250,204,21,0.34)] sm:order-2 sm:max-w-sm sm:scale-[1.04] sm:rounded-[2.5rem] sm:py-5'
                              : isTopRank && rank === 2
                                ? 'order-2 rounded-[1.5rem] bg-slate-100/10 py-3 shadow-[0_0_42px_rgba(226,232,240,0.28)] sm:order-1 sm:rounded-[2.5rem] sm:py-4'
                                : isTopRank && rank === 3
                                  ? 'order-3 rounded-[1.5rem] bg-orange-500/12 py-3 shadow-[0_0_42px_rgba(194,65,12,0.28)] sm:rounded-[2.5rem] sm:py-4'
                                  : selected
                                    ? 'scale-[1.03]'
                                    : 'hover:scale-[1.02]'
                          }`}
                        >
                          {voteSubmitted && (
                            <div
                              className={`relative mx-auto mb-2 w-fit rounded-full border px-2 py-1 text-[10px] font-black sm:px-4 sm:text-xs ${
                                rank === 1
                                  ? 'border-yellow-100 bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-500 text-black shadow-[0_0_22px_rgba(250,204,21,0.35)]'
                                  : rank === 2
                                    ? 'border-slate-100 bg-gradient-to-r from-white via-slate-300 to-slate-500 text-slate-950 shadow-[0_0_22px_rgba(226,232,240,0.35)]'
                                    : rank === 3
                                      ? 'border-orange-100 bg-gradient-to-r from-orange-100 via-amber-600 to-red-800 text-white shadow-[0_0_22px_rgba(194,65,12,0.38)]'
                                  : 'border-yellow-100/25 bg-black/35 text-yellow-100'
                              }`}
                            >
                              {rank === 1 && (
                                <span className="absolute -top-7 left-1/2 flex h-8 w-10 -translate-x-1/2 items-center justify-center drop-shadow-[0_0_16px_rgba(250,204,21,0.75)] sm:-top-9 sm:h-10 sm:w-12">
                                  <svg viewBox="0 0 64 48" className="h-full w-full" aria-label={`มงกุฎอันดับ ${rank}`}>
                                    <path
                                      d="M8 18 22 30 32 8 42 30 56 18 50 42H14L8 18Z"
                                      fill="#facc15"
                                      stroke="#fff7c2"
                                      strokeWidth="3"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M15 42h34"
                                      stroke="#92400e"
                                      strokeWidth="5"
                                      strokeLinecap="round"
                                    />
                                    <circle cx="32" cy="8" r="4" fill="#fff7c2" />
                                    <circle cx="8" cy="18" r="3" fill="#fff7c2" />
                                    <circle cx="56" cy="18" r="3" fill="#fff7c2" />
                                  </svg>
                                </span>
                              )}
                              อันดับ {rank}
                            </div>
                          )}
                          <input
                            type="radio"
                            name={category.id}
                            value={option.id}
                            checked={selected}
                            onChange={() => undefined}
                            className="sr-only"
                          />
                          <div
                            className="relative mx-auto aspect-square w-full max-w-[5.6rem] rounded-full p-[4px] shadow-[0_0_24px_rgba(250,204,21,0.24)] transition-all duration-700 sm:max-w-[12rem] sm:p-[6px] sm:shadow-[0_0_34px_rgba(250,204,21,0.28)]"
                            style={{
                              background: voteSubmitted
                                ? rank === 1
                                  ? `conic-gradient(#fde68a 0% ${result.percent}%, rgba(255,255,255,0.16) ${result.percent}% 100%)`
                                  : rank === 2
                                    ? `conic-gradient(#e2e8f0 0% ${result.percent}%, rgba(255,255,255,0.16) ${result.percent}% 100%)`
                                    : rank === 3
                                      ? `conic-gradient(#c2410c 0% ${result.percent}%, rgba(255,255,255,0.16) ${result.percent}% 100%)`
                                      : `conic-gradient(#fde68a 0% ${result.percent}%, rgba(255,255,255,0.16) ${result.percent}% 100%)`
                                : selected
                                  ? 'conic-gradient(from 0deg, #fff7c2, #facc15, #7c2d12, #fff7c2)'
                                  : 'conic-gradient(from 0deg, rgba(255,247,194,0.8), rgba(250,204,21,0.45), rgba(124,45,18,0.65), rgba(255,247,194,0.8))',
                            }}
                          >
                            <div className="absolute inset-[-5px] rounded-full border border-yellow-100/20 sm:inset-[-10px]" />
                            <div className="absolute inset-[-9px] rounded-full border border-yellow-100/10 sm:inset-[-18px]" />
                            <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#4b1208] bg-black sm:border-4">
                              {option.image_url ? (
                                <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(250,204,21,0.18),rgba(0,0,0,0.8))] px-4 text-center text-sm font-black text-yellow-100/70">
                                  เพิ่มรูปใน Admin
                                </div>
                              )}
                            </div>
                            {selected && !voteSubmitted && (
                              <div className="absolute right-0 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-100 bg-[#6d170c] text-xs font-black text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,0.45)]">
                                เลือก
                              </div>
                            )}
                            {voteSubmitted && (
                              <div className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 items-center sm:-right-16 sm:left-auto sm:top-1/2 sm:bottom-auto sm:translate-x-0 sm:-translate-y-1/2">
                                <div
                                  className={`hidden h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent sm:block ${
                                    rank === 2 ? 'border-r-slate-500' : rank === 3 ? 'border-r-red-900' : 'border-r-[#5b140b]'
                                  }`}
                                />
                                <div
                                  className={`rounded-xl border px-1.5 py-1 shadow-[0_0_18px_rgba(0,0,0,0.55)] backdrop-blur sm:rounded-2xl sm:px-2.5 sm:py-2 ${
                                    rank === 2
                                      ? 'border-slate-100/60 bg-slate-500/95 text-white'
                                      : rank === 3
                                        ? 'border-orange-100/60 bg-red-900/95 text-orange-100'
                                        : 'border-yellow-100/50 bg-[#5b140b]/95 text-yellow-100'
                                  }`}
                                >
                                  <span className="block text-xs font-black leading-none sm:text-lg">{result.percent}%</span>
                                  <span className="mt-0.5 block text-[8px] font-bold opacity-80 sm:text-[9px]">{result.count} คะแนน</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mx-auto mt-9 w-fit max-w-full rounded-full border border-yellow-100/50 bg-[#5b140b]/90 px-2 py-1 text-[10px] font-black text-yellow-50 shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:mt-5 sm:px-4 sm:py-1.5 sm:text-base">
                            {option.label}
                          </div>
                          {voteSubmitted ? (
                            <div className="mx-auto mt-2 w-fit rounded-full border border-yellow-100/30 bg-black/35 px-2 py-1 text-[9px] font-black text-yellow-100 sm:mt-3 sm:px-3 sm:text-[11px]">
                              {result.count} คะแนนโหวต
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectVoteOption(category.id, option.id);
                              }}
                              className={`mx-auto mt-2 block w-fit rounded-full px-4 py-1 text-xs font-black uppercase tracking-wide shadow-[0_8px_20px_rgba(250,204,21,0.22)] transition-all ${
                                selected
                                  ? 'bg-white text-[#58130b]'
                                  : 'bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-500 text-black hover:scale-105'
                              }`}
                            >
                              {selected ? 'เลือกแล้ว' : 'กดโหวต'}
                            </button>
                          )}
                          {isTopRank && (
                            <div
                              className="relative mx-auto mt-3 w-full max-w-[6.4rem] text-center sm:mt-4 sm:max-w-[15rem]"
                            >
                              <div
                                className={`relative flex flex-col items-center justify-center overflow-hidden rounded-t-xl rounded-b-2xl border px-2 shadow-[0_14px_24px_rgba(0,0,0,0.34)] sm:rounded-t-2xl sm:rounded-b-[1.75rem] sm:px-3 sm:shadow-[0_18px_34px_rgba(0,0,0,0.38)] ${
                                  rank === 1 ? 'h-16 sm:h-32' : rank === 2 ? 'h-14 sm:h-24' : 'h-12 sm:h-20'
                                }`}
                                style={{
                                  background:
                                    rank === 1
                                      ? 'linear-gradient(180deg, #fff2a8 0%, #f6c434 42%, #c26a08 72%, #7a2e06 100%)'
                                      : rank === 2
                                        ? 'linear-gradient(180deg, #f8fafc 0%, #cbd5e1 45%, #64748b 78%, #334155 100%)'
                                        : 'linear-gradient(180deg, #fed7aa 0%, #ea580c 48%, #9a3412 78%, #431407 100%)',
                                  borderColor:
                                    rank === 1 ? 'rgba(254, 240, 138, 0.78)' : rank === 2 ? 'rgba(226, 232, 240, 0.78)' : 'rgba(254, 215, 170, 0.78)',
                                  color: '#111827',
                                }}
                              >
                                <div
                                  className="absolute inset-x-0 bottom-0 h-5"
                                  style={{ background: 'rgba(0, 0, 0, 0.18)' }}
                                />
                                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                                  อันดับ
                                </span>
                                <span className="relative z-10 -mt-1 text-4xl font-black leading-none sm:text-7xl">
                                  {rank}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}

            {voteSubmitted ? (
              <div className="rounded-[2rem] border border-yellow-200/30 bg-[radial-gradient(circle_at_50%_0%,rgba(255,238,190,0.22),transparent_36%),linear-gradient(135deg,rgba(17,5,3,0.95),rgba(78,11,8,0.78))] p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-100/80">Ballot Submitted</p>
                <h2 className="mt-2 text-2xl font-black text-[#ffe8a8]">ส่งผลโหวตแล้ว</h2>
                <p className="mt-2 text-amber-50/80">เปอร์เซ็นต์ด้านบนคำนวณแยกตามแต่ละหมวดรางวัล</p>
              </div>
            ) : (
              <div
                ref={voteActionsRef}
                className="sticky bottom-0 z-20 -mx-4 border-t border-yellow-200/20 bg-[#120302]/95 px-4 pt-3 pb-4 backdrop-blur sm:mx-0 sm:rounded-[2rem] sm:border sm:bg-black/55 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  {activeVoteIndex > 0 && (
                    <button
                      type="button"
                      onClick={goToPreviousVoteCategory}
                      className="w-full rounded-full border border-yellow-100/25 bg-black/35 px-8 py-4 text-base font-black text-yellow-100 transition-all hover:bg-black/55 sm:w-auto"
                    >
                      ย้อนกลับ
                    </button>
                  )}
                  <button
                    type={isLastVoteCategory ? 'submit' : 'button'}
                    onClick={isLastVoteCategory ? undefined : goToNextVoteCategory}
                    disabled={
                      submittingVote ||
                      voteOptions.length === 0 ||
                      !activeVoteSelected ||
                      (isLastVoteCategory && !canSubmitVote)
                    }
                    className="w-full px-8 py-4 rounded-full font-black text-base bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 text-black hover:from-white hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_16px_40px_rgba(250,204,21,0.28)]"
                  >
                    {submittingVote ? 'กำลังส่งผลโหวต...' : isLastVoteCategory ? 'ส่งโหวต' : 'ถัดไป'}
                  </button>
                </div>
                <p className="mt-2 text-center text-xs text-yellow-100/60">
                  เลือกครบ 1 ทีม เพื่อไปยังรางวัลถัดไป
                </p>
              </div>
            )}
          </form>
        )}
      </main>

      {showVotePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-yellow-300/30 bg-[#111] p-7 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-yellow-300 mb-3">ส่งคำตอบเรียบร้อยแล้ว</h2>
            <p className="text-gray-300 mb-6">ขั้นตอนถัดไปคือการโหวตรางวัล Stop Motion & AI Video Creation</p>
            <button
              type="button"
              onClick={() => {
                setShowVotePrompt(false);
                scrollToTop();
              }}
              className="w-full px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
            >
              ไปยังการโหวต
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default InnoClubSecondEvaluationPage;
