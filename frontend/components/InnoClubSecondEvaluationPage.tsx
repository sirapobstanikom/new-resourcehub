import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type VoteOption = {
  id: string;
  label: string;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number | null;
};

const MAX_UPLOAD_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_SIDE = 900;

const cropImageToDataUrl = (previewUrl: string, zoom: number) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = MAX_IMAGE_SIDE;
      canvas.height = MAX_IMAGE_SIDE;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Cannot crop image'));
        return;
      }

      const sourceSize = Math.min(image.width, image.height) / zoom;
      const sourceX = (image.width - sourceSize) / 2;
      const sourceY = (image.height - sourceSize) / 2;
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, MAX_IMAGE_SIDE, MAX_IMAGE_SIDE);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      reject(new Error('Cannot load image'));
    };
    image.src = previewUrl;
  });

type VoteCategoryId = 'best_storytelling' | 'most_creative_product_launch' | 'most_market_impact';

type VoteResults = Partial<Record<VoteCategoryId, { total: number; counts: Record<string, number> }>>;

type VoteRow = {
  best_storytelling_option_id: string | null;
  most_creative_product_launch_option_id: string | null;
  most_market_impact_option_id: string | null;
};

type CropDraft = {
  option: VoteOption;
  previewUrl: string;
  zoom: number;
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

const THEATER_PAGE_CLASS =
  'min-h-screen bg-transparent text-white flex flex-col selection:bg-yellow-300 selection:text-black innoclub-angsana';

const INNOCLUB_SECOND_BACKGROUND_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Background%20PTT%20Group.png';

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
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [voteResults, setVoteResults] = useState<VoteResults>({});
  const [error, setError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => REFLECTION_QUESTIONS.filter((q) => answers[q.id].trim().length > 0).length,
    [answers]
  );
  const canSubmitReflection = answeredCount === REFLECTION_QUESTIONS.length;
  const canSubmitVote = VOTE_CATEGORIES.every((category) => votes[category.id]);

  const getVoteResult = (categoryId: VoteCategoryId, optionId: string) => {
    const categoryResult = voteResults[categoryId];
    const total = categoryResult?.total ?? 0;
    const count = categoryResult?.counts[optionId] ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, total, percent };
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

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const loadVoteResults = async () => {
    const { data, error: loadError } = await supabase
      .from('innoclub_second_votes')
      .select('best_storytelling_option_id, most_creative_product_launch_option_id, most_market_impact_option_id');

    if (loadError) {
      setError(loadError.message);
      return false;
    }

    const nextResults: Record<VoteCategoryId, { total: number; counts: Record<string, number> }> = {
      best_storytelling: { total: 0, counts: {} },
      most_creative_product_launch: { total: 0, counts: {} },
      most_market_impact: { total: 0, counts: {} },
    };

    ((data as VoteRow[]) || []).forEach((row) => {
      VOTE_CATEGORIES.forEach((category) => {
        const optionId = row[VOTE_RESULT_COLUMNS[category.id]];
        if (!optionId) return;
        nextResults[category.id].total += 1;
        nextResults[category.id].counts[optionId] = (nextResults[category.id].counts[optionId] || 0) + 1;
      });
    });

    setVoteResults(nextResults);
    return true;
  };

  const handleReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmitReflection) {
      setError('กรุณาตอบคำถามให้ครบทั้ง 3 ข้อ');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    setSubmittingReflection(true);
    const { error: submitError } = await supabase.from('innoclub_second_reflections').insert({
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
    await loadVoteResults();
    setSubmittingVote(false);
    setVoteSubmitted(true);
  };

  const prepareImageCrop = (option: VoteOption, file: File | undefined) => {
    if (!file) return;
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (file.size > MAX_UPLOAD_SOURCE_BYTES) {
      setError('รูปใหญ่เกินไป กรุณาใช้รูปไม่เกิน 8MB');
      return;
    }
    setError(null);
    setCropDraft((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { option, previewUrl: URL.createObjectURL(file), zoom: 1 };
    });
  };

  const closeCropDraft = () => {
    setCropDraft((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const saveCroppedImage = async () => {
    if (!cropDraft) return;
    setUploadingImageId(cropDraft.option.id);
    setError(null);
    try {
      const imageUrl = await cropImageToDataUrl(cropDraft.previewUrl, cropDraft.zoom);
      const { error: uploadError } = await supabase
        .from('innoclub_second_vote_options')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', cropDraft.option.id);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      setVoteOptions((prev) =>
        prev.map((item) => (item.id === cropDraft.option.id ? { ...item, image_url: imageUrl } : item))
      );
      closeCropDraft();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploadingImageId(null);
    }
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
          <span className="font-black tracking-tight text-sm text-yellow-100">INNO Influencer</span>
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
            ตอบคำถามวัดผลจากกิจกรรม Stop Motion & AI Video Creation
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
                  {answeredCount}/3 <span className="text-gray-400">ข้อ</span>
                </p>
              </div>
              <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden border border-yellow-200/10">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-yellow-200 to-amber-500 transition-all shadow-[0_0_18px_rgba(250,204,21,0.48)]"
                  style={{ width: `${(answeredCount / REFLECTION_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleReflectionSubmit} className="space-y-6">
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
            <section className="relative overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(145deg,rgba(49,8,5,0.9),rgba(12,2,1,0.92)_52%,rgba(35,13,3,0.95))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.44)] sm:p-8">
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
              VOTE_CATEGORIES.map((category, index) => (
                <section
                  key={category.id}
                  className="relative overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(145deg,rgba(49,8,5,0.9),rgba(12,2,1,0.92)_52%,rgba(35,13,3,0.95))] p-4 sm:p-7 shadow-[0_18px_60px_rgba(0,0,0,0.44)]"
                >
                  <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-yellow-100/10" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/80 to-transparent" />
                  <div className="relative mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-yellow-100/50 bg-yellow-100/15 text-2xl font-black text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.18)]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-100/65">Award Category</p>
                      <h3 className="mt-1 text-xl sm:text-3xl font-black text-[#ffe8a8]">
                        {category.title}
                      </h3>
                      <p className="mt-1 text-amber-50/75">{category.description}</p>
                    </div>
                  </div>
                  <div
                    className={`relative grid gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-10 ${
                      voteSubmitted ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'
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
                      const isUploading = uploadingImageId === option.id;
                      const result = getVoteResult(category.id, option.id);
                      const rank = rankIndex + 1;
                      const isWinner = voteSubmitted && rank === 1 && result.total > 0;
                      const isTopRank = voteSubmitted && rank <= 3 && result.total > 0;
                      return (
                        <div
                          key={option.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!voteSubmitted) setVotes((prev) => ({ ...prev, [category.id]: option.id }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!voteSubmitted) setVotes((prev) => ({ ...prev, [category.id]: option.id }));
                            }
                          }}
                          className={`group relative cursor-pointer rounded-[2rem] px-2 pb-3 pt-2 text-center transition-all hover:-translate-y-1 ${
                            isTopRank && rank === 1
                              ? 'col-span-1 mx-auto w-full max-w-sm scale-[1.02] rounded-[2.5rem] bg-yellow-100/10 py-5 shadow-[0_0_54px_rgba(250,204,21,0.34)] sm:col-span-2 sm:scale-[1.04]'
                              : isTopRank && rank === 2
                                ? 'rounded-[2.5rem] bg-slate-100/10 py-4 shadow-[0_0_42px_rgba(226,232,240,0.28)]'
                                : isTopRank && rank === 3
                                  ? 'rounded-[2.5rem] bg-orange-500/12 py-4 shadow-[0_0_42px_rgba(194,65,12,0.28)]'
                                  : selected
                                    ? 'scale-[1.03]'
                                    : 'hover:scale-[1.02]'
                          }`}
                        >
                          {voteSubmitted && (
                            <div
                              className={`relative mx-auto mb-2 w-fit rounded-full border px-4 py-1 text-xs font-black ${
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
                                <span className="absolute -top-9 left-1/2 flex h-10 w-12 -translate-x-1/2 items-center justify-center drop-shadow-[0_0_16px_rgba(250,204,21,0.75)]">
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
                            className="relative mx-auto aspect-square w-full max-w-[12rem] rounded-full p-[6px] shadow-[0_0_34px_rgba(250,204,21,0.28)] transition-all duration-700"
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
                            <div className="absolute inset-[-10px] rounded-full border border-yellow-100/20" />
                            <div className="absolute inset-[-18px] rounded-full border border-yellow-100/10" />
                            <div className="h-full w-full overflow-hidden rounded-full border-4 border-[#4b1208] bg-black">
                              {option.image_url ? (
                                <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(250,204,21,0.18),rgba(0,0,0,0.8))] px-4 text-center text-sm font-black text-yellow-100/70">
                                  กดอัปโหลดรูป
                                </div>
                              )}
                            </div>
                            {selected && !voteSubmitted && (
                              <div className="absolute right-0 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-100 bg-[#6d170c] text-xs font-black text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,0.45)]">
                                เลือก
                              </div>
                            )}
                            {voteSubmitted && (
                              <div className="absolute -right-10 top-1/2 flex -translate-y-1/2 items-center sm:-right-16">
                                <div
                                  className={`h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent ${
                                    rank === 2 ? 'border-r-slate-500' : rank === 3 ? 'border-r-red-900' : 'border-r-[#5b140b]'
                                  }`}
                                />
                                <div
                                  className={`rounded-2xl border px-2 py-1.5 shadow-[0_0_24px_rgba(0,0,0,0.65)] backdrop-blur sm:px-2.5 sm:py-2 ${
                                    rank === 2
                                      ? 'border-slate-100/60 bg-slate-500/95 text-white'
                                      : rank === 3
                                        ? 'border-orange-100/60 bg-red-900/95 text-orange-100'
                                        : 'border-yellow-100/50 bg-[#5b140b]/95 text-yellow-100'
                                  }`}
                                >
                                  <span className="block text-base font-black leading-none sm:text-lg">{result.percent}%</span>
                                  <span className="mt-0.5 block text-[9px] font-bold opacity-80">{result.count} คะแนน</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mx-auto mt-3 w-fit max-w-full rounded-full border border-yellow-100/50 bg-[#5b140b]/90 px-4 py-1.5 text-sm font-black text-yellow-50 shadow-[0_8px_20px_rgba(0,0,0,0.35)] sm:-mt-2 sm:text-base">
                            {option.label}
                          </div>
                          {voteSubmitted ? (
                            <div className="mx-auto mt-3 w-fit rounded-full border border-yellow-100/30 bg-black/35 px-3 py-1 text-[11px] font-black text-yellow-100">
                              {result.count} คะแนนโหวต
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVotes((prev) => ({ ...prev, [category.id]: option.id }));
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
                          <label
                            className="mx-auto mt-2 block w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-yellow-100 hover:bg-white/20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={isUploading}
                              onChange={(e) => {
                                prepareImageCrop(option, e.target.files?.[0]);
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>
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
              <div className="sticky bottom-0 z-20 -mx-4 border-t border-yellow-200/20 bg-[#120302]/95 px-4 pt-3 pb-4 backdrop-blur sm:mx-0 sm:rounded-[2rem] sm:border sm:bg-black/55 sm:p-4">
                <button
                  type="submit"
                  disabled={submittingVote || !canSubmitVote || voteOptions.length === 0}
                  className="w-full px-8 py-4 rounded-full font-black text-base bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 text-black hover:from-white hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_16px_40px_rgba(250,204,21,0.28)]"
                >
                  {submittingVote ? 'กำลังส่งผลโหวต...' : 'กดโหวต'}
                </button>
                <p className="mt-2 text-center text-xs text-yellow-100/60">เลือกให้ครบทั้ง 3 หมวด แล้วกดโหวตด้านล่าง</p>
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
              onClick={() => setShowVotePrompt(false)}
              className="w-full px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
            >
              ไปยังการโหวต
            </button>
          </div>
        </div>
      )}

      {cropDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-yellow-200/30 bg-[#140504] p-5 text-center shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100/70">Crop Nominee Photo</p>
            <h2 className="mt-2 text-2xl font-black text-yellow-100">{cropDraft.option.label}</h2>
            <div className="mx-auto mt-5 aspect-square w-full max-w-[17rem] overflow-hidden rounded-full border-[6px] border-yellow-100 bg-black shadow-[0_0_35px_rgba(250,204,21,0.28)]">
              <img
                src={cropDraft.previewUrl}
                alt={cropDraft.option.label}
                className="h-full w-full object-cover transition-transform duration-150"
                style={{ transform: `scale(${cropDraft.zoom})` }}
              />
            </div>
            <div className="mt-5 rounded-2xl border border-yellow-100/20 bg-black/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-yellow-100/80">
                <span>ซูมออก</span>
                <span>{Math.round(cropDraft.zoom * 100)}%</span>
                <span>ซูมเข้า</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.6"
                step="0.05"
                value={cropDraft.zoom}
                onChange={(e) => setCropDraft((prev) => (prev ? { ...prev, zoom: Number(e.target.value) } : prev))}
                className="w-full accent-yellow-300"
              />
              <p className="mt-2 text-xs text-yellow-100/55">จัดรูปให้อยู่ในวงกลม แล้วกดบันทึกรูป</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeCropDraft}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/20"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveCroppedImage}
                disabled={uploadingImageId === cropDraft.option.id}
                className="rounded-full bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-500 px-4 py-3 font-black text-black disabled:opacity-60"
              >
                {uploadingImageId === cropDraft.option.id ? 'กำลังบันทึก...' : 'บันทึกรูป'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InnoClubSecondEvaluationPage;
