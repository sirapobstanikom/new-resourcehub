import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import BrandLogo from './components/BrandLogo';
import { JOURNEY_DATA, UPDATES_DATA, getToolById, getUpdateById } from './constants';
import { Tool, InnovationUpdate } from './types';
import JourneyCard from './components/JourneyCard';
import UpdateCard from './components/UpdateCard';
import HomePage from './components/HomePage';
import { useAuth } from './contexts/AuthContext';
import { isAdminAuthenticated, isAuthenticated, logoutAdmin, logoutResourceHub } from './lib/auth';
import { updateSeoTags } from './lib/seo';

/** โหลดแยก chunk — ลดขนาด bundle หลักบน Vite build / Vercel */
const ToolDetail = lazy(() => import('./components/ToolDetail'));
const UpdateDetail = lazy(() => import('./components/UpdateDetail'));
const AIChatModal = lazy(() => import('./components/AIChatModal'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const AdminLoginPage = lazy(() => import('./components/AdminLoginPage'));
const AdminApprovePage = lazy(() => import('./components/AdminApprovePage'));
const AdminLayoutWithSidebar = lazy(() => import('./components/AdminLayoutWithSidebar'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminCourseWheelPage = lazy(() => import('./components/AdminCourseWheelPage'));
const AdminLeavePage = lazy(() => import('./components/AdminLeavePage'));
const AdminLeaveManagePage = lazy(() => import('./components/AdminLeaveManagePage'));
const AdminCourseOutingDashboardPage = lazy(() => import('./components/AdminCourseOutingDashboardPage'));
const AdminStickycloudPage = lazy(() => import('./components/AdminStickycloudPage'));
const JoinRoomPage = lazy(() => import('./components/JoinRoomPage'));
const RoomWorkspacePage = lazy(() => import('./components/RoomWorkspacePage'));
const DiscAssessment = lazy(() => import('./components/DiscAssessment'));
const MbtiAssessment = lazy(() => import('./components/MbtiAssessment'));
const LeadershipAssessment = lazy(() => import('./components/LeadershipAssessment'));
const PersuasionAssessment = lazy(() => import('./components/PersuasionAssessment'));
const DigitalLeadershipAssessment = lazy(() => import('./components/DigitalLeadershipAssessment'));
const ReactiveProactiveMindsetAssessment = lazy(() => import('./components/ReactiveProactiveMindsetAssessment'));
const GrowthFixedMindsetAssessment = lazy(() => import('./components/GrowthFixedMindsetAssessment'));
const ConflictManagementStyleAssessment = lazy(() => import('./components/ConflictManagementStyleAssessment'));
const KeyPrinciplesAssessment = lazy(() => import('./components/KeyPrinciplesAssessment'));
const MindDojoAssessment = lazy(() => import('./components/MindDojoAssessment'));
const MindDojoResultPage = lazy(() => import('./components/MindDojoResultPage'));
const AdminMindDojoAssessmentUsersPage = lazy(() => import('./components/AdminMindDojoAssessmentUsersPage'));
const Game10Timeout = lazy(() => import('./components/Game10Timeout'));
const GameReaction = lazy(() => import('./components/GameReaction'));
const GameAr = lazy(() => import('./components/GameAr'));
const GameHiddenFox = lazy(() => import('./components/GameHiddenFox'));
const GameSpotDifference = lazy(() => import('./components/GameSpotDifference'));
const GameCameraBlockJump = lazy(() => import('./components/GameCameraBlockJump'));
const GamePrizeCatch = lazy(() => import('./components/GamePrizeCatch'));
const GameSkillConnector = lazy(() => import('./components/GameSkillConnector'));
const GameAiHrChallenge = lazy(() => import('./components/GameAiHrChallenge'));
const GameFaceScan = lazy(() => import('./components/GameFaceScan'));
const WhaleDoneRolePlayPage = lazy(() => import('./components/WhaleDoneRolePlayPage'));
const InnoClubEvaluationPage = lazy(() => import('./components/InnoClubEvaluationPage'));
const InnoClubSecondEvaluationPage = lazy(() => import('./components/InnoClubSecondEvaluationPage'));
const InnoClubSecondVideoPage = lazy(() => import('./components/InnoClubSecondVideoPage'));
const AdminInnoClubSecondVotePage = lazy(() => import('./components/AdminInnoClubSecondVotePage'));
const AdminInnoClubDashboardPage = lazy(() => import('./components/AdminInnoClubDashboardPage'));
const AdminTeambuildingDashboardPage = lazy(() => import('./components/AdminTeambuildingDashboardPage'));
const TeambuildingScoreboardPage = lazy(() => import('./components/TeambuildingScoreboardPage'));
const InnoClubGameResultsPage = lazy(() => import('./components/InnoClubGameResultsPage'));
const InnoClubSatisfactionScoreboardPage = lazy(() => import('./components/InnoClubSatisfactionScoreboardPage'));
const HogwartsInnoclubPage = lazy(() => import('./components/HogwartsInnoclubPage'));
const EvaEditorPage = lazy(() => import('./components/EvaEditorPage'));
const EvaPublicFormPage = lazy(() => import('./components/EvaPublicFormPage'));
const EvaDashboardPage = lazy(() => import('./components/EvaDashboardPage'));
const EvaDashboardLoginPage = lazy(() => import('./components/EvaDashboardLoginPage'));
const EvaOnePageSummaryPage = lazy(() => import('./components/EvaOnePageSummaryPage'));
const PeerFeedbackAudienceGridPage = lazy(() => import('./components/PeerFeedbackAudienceGridPage'));
const InnovationEvaluationPage = lazy(() => import('./components/InnovationEvaluationPage'));
const AdminInnovationEvaluateesPage = lazy(() => import('./components/AdminInnovationEvaluateesPage'));
const AdminAssessmentLinksQrPage = lazy(() => import('./components/AdminAssessmentLinksQrPage'));
const AdminPdfCompressPage = lazy(() => import('./components/AdminPdfCompressPage'));
const WhaleDoneRolePlayDashboardPage = lazy(
  () => import('./components/WhaleDoneRolePlayDashboardPage')
);
const ElevateAnswerKeySelectPage = lazy(() => import('./components/ElevateAnswerKeySelectPage'));
const ElevateAnswerKeyPage = lazy(() => import('./components/ElevateAnswerKeyPage'));
const ElevatePretestPosttestEditorPage = lazy(() => import('./components/ElevatePretestPosttestEditorPage'));
const ElevatePretestPosttestFormPage = lazy(() => import('./components/ElevatePretestPosttestFormPage'));
const ElevatePretestPosttestDashboardPage = lazy(() => import('./components/ElevatePretestPosttestDashboardPage'));
const ActivityRegistrationPage = lazy(() => import('./components/ActivityRegistrationPage'));
const LinkVaultPage = lazy(() => import('./components/LinkVaultPage'));

function cleanupArOverlays(): void {
  document.querySelectorAll('video').forEach((v) => {
    const media = v as HTMLVideoElement;
    if (!media.classList.contains('arjs-video')) return;
    const stream = media.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      media.srcObject = null;
    }
    media.remove();
  });
  document.querySelectorAll('.a-canvas').forEach((el) => {
    if (el instanceof HTMLElement) el.remove();
  });
}

function RouteFallback() {
  return (
    <div className="md-page items-center justify-center">
      <p className="text-sm font-medium tracking-wide text-gray-700">กำลังโหลด...</p>
    </div>
  );
}

function ToolsPage() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0">
      {JOURNEY_DATA.map((category) => (
        <JourneyCard
          key={category.id}
          category={category}
          onToolClick={(tool: Tool) => {
            navigate(`/tool/${tool.id}`);
            window.scrollTo(0, 0);
          }}
        />
      ))}
    </div>
  );
}

function UpdatesPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-12 max-w-5xl mx-auto">
      {UPDATES_DATA.map((update) => (
        <UpdateCard
          key={update.id}
          update={update}
          onClick={(u: InnovationUpdate) => {
            navigate(`/update/${u.id}`);
            window.scrollTo(0, 0);
          }}
        />
      ))}
    </div>
  );
}

function ToolDetailPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const tool = toolId ? getToolById(toolId) : undefined;

  if (!tool) return <Navigate to="/resourcehub" replace />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <ToolDetail
        tool={tool}
        onBack={() => navigate(-1)}
        onAskAI={() => setIsAIModalOpen(true)}
      />
      {isAIModalOpen && (
        <AIChatModal toolName={tool.name} onClose={() => setIsAIModalOpen(false)} />
      )}
    </Suspense>
  );
}

function UpdateDetailPage() {
  const { updateId } = useParams<{ updateId: string }>();
  const navigate = useNavigate();
  const update = updateId ? getUpdateById(updateId) : undefined;

  if (!update) return <Navigate to="/updates" replace />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <UpdateDetail update={update} onBack={() => navigate(-1)} />
    </Suspense>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const resourceHubLoggedIn = isAuthenticated();
  if (loading && !resourceHubLoggedIn) return null;
  if (!user && !resourceHubLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) logoutAdmin();
  }, [loading, user]);

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F3F2ED] text-gray-900">
        <p className="text-base font-medium text-gray-700">กำลังโหลด Admin…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

const App: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const resourceHubLoggedIn = isAuthenticated();
  const pathname = location.pathname;
  const isLogin = pathname === '/login';
  const isAdminLogin = pathname === '/admin/login';
  const isHome = pathname === '/' || pathname === '/home';
  const isDetailView = pathname.startsWith('/tool/') || pathname.startsWith('/update/');
  const isTools = pathname === '/resourcehub';
  const isUpdates = pathname === '/updates';

  useEffect(() => {
    updateSeoTags(pathname);
  }, [pathname]);

  useEffect(() => {
    if (navigationType === 'POP' || location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  useEffect(() => {
    const isArPage = pathname === '/gamification/game-ar' || pathname === '/game-ar';
    if (!isArPage) cleanupArOverlays();
  }, [pathname]);

  /** คืนค่า scroll หลังออกจากเกม/หน้าที่ lock body (เช่น Hidden Fox CSS เก่า) */
  useEffect(() => {
    const lockRoutes = ['/gamification/hidden-fox', '/gamification/game-ar', '/game-ar'];
    const locksScroll = lockRoutes.some((r) => pathname.startsWith(r) || pathname === r);
    if (!locksScroll) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      const root = document.getElementById('root');
      if (root) root.style.overflow = '';
    }
  }, [pathname]);

  if (isLogin) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    );
  }
  if (pathname === '/register') return <Navigate to="/login" replace />;
  if (isAdminLogin) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminLoginPage />
      </Suspense>
    );
  }
  if (pathname === '/admin/approve') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminApprovePage />
      </Suspense>
    );
  }
  if (pathname === '/course-wheel') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminCourseWheelPage />
      </Suspense>
    );
  }
  if (pathname.startsWith('/admin')) {
    return (
      <AdminLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/admin" element={<AdminLayoutWithSidebar />}>
              <Route index element={<AdminDashboard />} />
              <Route path="course-wheel" element={<AdminCourseWheelPage />} />
              <Route path="leave" element={<AdminLeavePage />} />
              <Route path="leave/manage" element={<AdminLeaveManagePage />} />
              <Route path="course-outings/:role" element={<AdminCourseOutingDashboardPage />} />
              <Route path="rooms" element={<AdminStickycloudPage />} />
              <Route path="minddojo-users" element={<AdminMindDojoAssessmentUsersPage />} />
              <Route path="innoclub-2-vote" element={<AdminInnoClubSecondVotePage />} />
              <Route path="innoclub-dashboard" element={<AdminInnoClubDashboardPage />} />
              <Route path="teambuilding-dashboard" element={<AdminTeambuildingDashboardPage />} />
              <Route path="innovation-evaluatees" element={<AdminInnovationEvaluateesPage />} />
              <Route path="assessment-links" element={<AdminAssessmentLinksQrPage />} />
              <Route path="pdf-compress" element={<AdminPdfCompressPage />} />
              <Route
                path="whale-done-role-play"
                element={<Navigate to="/gamification/whale-done-role-play/dashboard" replace />}
              />
            </Route>
          </Routes>
        </Suspense>
      </AdminLayout>
    );
  }

  if (pathname.startsWith('/assessment')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/assessment/disc" element={<DiscAssessment />} />
          <Route path="/assessment/mbti" element={<MbtiAssessment />} />
          <Route path="/assessment/leadership" element={<LeadershipAssessment />} />
          <Route path="/assessment/leaderships" element={<LeadershipAssessment />} />
          <Route path="/assessment/persuasion" element={<PersuasionAssessment />} />
          <Route path="/assessment/digital-leadership" element={<DigitalLeadershipAssessment />} />
          <Route
            path="/assessment/reactive-proactive-mindset"
            element={<ReactiveProactiveMindsetAssessment />}
          />
          <Route
            path="/assessment/growth-fixed-mindset"
            element={<GrowthFixedMindsetAssessment />}
          />
          <Route
            path="/assessment/conflict-management-style"
            element={<ConflictManagementStyleAssessment />}
          />
          <Route path="/assessment/key-principles" element={<KeyPrinciplesAssessment />} />
          <Route path="/assessment/minddojo/result" element={<MindDojoResultPage />} />
          <Route path="/assessment/minddojo" element={<MindDojoAssessment />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/gamification')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/gamification/10-timeout" element={<Game10Timeout />} />
          <Route path="/gamification/reaction" element={<GameReaction />} />
          <Route path="/gamification/game-ar" element={<GameAr />} />
          <Route path="/gamification/hidden-fox" element={<GameHiddenFox />} />
          <Route path="/gamification/spot-difference" element={<GameSpotDifference />} />
          <Route path="/gamification/camera-block-jump" element={<GameCameraBlockJump />} />
          <Route path="/gamification/camera-block-jump-game" element={<GameCameraBlockJump />} />
          <Route path="/gamification/prize-catch" element={<GamePrizeCatch />} />
          <Route path="/gamification/skill-connector" element={<GameSkillConnector />} />
          <Route path="/gamification/ai-hr-challenge" element={<GameAiHrChallenge />} />
          <Route path="/gamification/face-scan" element={<GameFaceScan />} />
          <Route path="/gamification/whale-done-role-play" element={<Navigate to="/gamification/whale-done-role-play/v1" replace />} />
          <Route path="/gamification/whale-done-role-play/dashboard" element={<WhaleDoneRolePlayDashboardPage />} />
          <Route path="/gamification/whale-done-role-play/:version" element={<WhaleDoneRolePlayPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname === '/game-ar') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <GameAr />
      </Suspense>
    );
  }

  if (pathname.startsWith('/evaluation')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/evaluation/innoclub" element={<InnoClubEvaluationPage />} />
          <Route path="/evaluation/innoclub-game" element={<InnoClubGameResultsPage />} />
          <Route path="/evaluation/innoclub-satisfaction" element={<InnoClubSatisfactionScoreboardPage />} />
          <Route path="/evaluation/teambuilding" element={<TeambuildingScoreboardPage />} />
          <Route path="/evaluation/innoclub-2" element={<InnoClubSecondEvaluationPage key="innoclub-2-form" />} />
          <Route
            path="/evaluation/innoclub-2/results"
            element={<InnoClubSecondEvaluationPage key="innoclub-2-results" resultsOnly />}
          />
          <Route path="/evaluation/tba-amazing-race/videos" element={<InnoClubSecondVideoPage />} />
          <Route path="/evaluation/tba-amazing-race/videos/dashboard" element={<InnoClubSecondVideoPage />} />
          <Route
            path="/evaluation/innoclub-2/videos"
            element={<Navigate to="/evaluation/tba-amazing-race/videos" replace />}
          />
          <Route
            path="/evaluation/innoclub-2/videos/dashboard"
            element={<Navigate to="/evaluation/tba-amazing-race/videos/dashboard" replace />}
          />
          <Route path="/evaluation/eva-editor" element={<EvaEditorPage />} />
          <Route path="/evaluation/eva-one-page" element={<EvaOnePageSummaryPage />} />
          <Route path="/evaluation/dashboard/login" element={<EvaDashboardLoginPage />} />
          <Route path="/evaluation/dashboard" element={<EvaDashboardPage />} />
          <Route path="/evaluation/form/:templateId" element={<EvaPublicFormPage />} />
          <Route path="/evaluation/innoclub-hogwarts" element={<HogwartsInnoclubPage />} />
          <Route path="/evaluation/innoclub-hogwarts-guest" element={<HogwartsInnoclubPage />} />
          <Route path="/evaluation/innovation/dashboard" element={<InnovationEvaluationPage />} />
          <Route path="/evaluation/innovation" element={<InnovationEvaluationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/peer-feedback')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/peer-feedback" element={<PeerFeedbackAudienceGridPage />} />
          <Route path="/peer-feedback/dashboard" element={<PeerFeedbackAudienceGridPage />} />
          <Route path="*" element={<Navigate to="/peer-feedback" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/elevate-answer-key')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/elevate-answer-key" element={<ElevateAnswerKeySelectPage />} />
          <Route path="/elevate-answer-key/:caseId" element={<ElevateAnswerKeyPage />} />
          <Route path="*" element={<Navigate to="/elevate-answer-key" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/elevate-pretest-posttest-editor')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/elevate-pretest-posttest-editor" element={<ElevatePretestPosttestEditorPage />} />
          <Route
            path="/elevate-pretest-posttest-editor/dashboard/:bankId"
            element={<ElevatePretestPosttestDashboardPage />}
          />
          <Route path="*" element={<Navigate to="/elevate-pretest-posttest-editor" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/elevate-pretest-posttest')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/elevate-pretest-posttest/:bankId/:phase" element={<ElevatePretestPosttestFormPage />} />
          <Route path="*" element={<Navigate to="/elevate-pretest-posttest-editor" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/activity-registration') || pathname.startsWith('/event-registration') || pathname.startsWith('/register-activity')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/activity-registration" element={<ActivityRegistrationPage />} />
          <Route path="/event-registration" element={<ActivityRegistrationPage />} />
          <Route path="/register-activity" element={<ActivityRegistrationPage />} />
          <Route path="*" element={<Navigate to="/activity-registration" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/links') || pathname.startsWith('/link-vault')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/links" element={<LinkVaultPage />} />
          <Route path="/link-vault" element={<LinkVaultPage />} />
          <Route path="*" element={<Navigate to="/links" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname.startsWith('/room')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/room" element={<JoinRoomPage />} />
          <Route path="/room/:roomId" element={<RoomWorkspacePage />} />
          <Route path="*" element={<Navigate to="/room" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (isHome) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    );
  }

  return (
    <div className="md-page">
      {!isDetailView && (
        <header className="relative px-6 pb-12 pt-16">
          <div className="relative z-10 mx-auto max-w-7xl text-center">
            <div className="mb-8 flex justify-center">
              <Link to="/" className="transition-opacity hover:opacity-90">
                <BrandLogo className="text-[36px]" tone="dark" />
              </Link>
            </div>

            <h1 className="mb-6 text-5xl font-semibold tracking-tight leading-tight text-gray-900 md:text-7xl">
              MindDoJo <span className="text-[#FFCC00]">Resourcehub</span>
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg font-medium text-gray-700">
              Explore our curated library of strategic frameworks and operational tools designed for modern organizational growth.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/resourcehub"
                className={`rounded-full px-8 py-3 font-bold transition-all ${
                  isTools
                    ? 'bg-[#FFCC00] text-black shadow-sm'
                    : 'border border-[#C8C5BA] bg-white text-gray-800 hover:border-gray-400'
                }`}
              >
                Operational Tools
              </Link>
              <Link
                to="/updates"
                className={`rounded-full px-8 py-3 font-bold transition-all ${
                  isUpdates
                    ? 'bg-[#FFCC00] text-black shadow-sm'
                    : 'border border-[#C8C5BA] bg-white text-gray-800 hover:border-gray-400'
                }`}
              >
                Industry Updates
              </Link>
              {(user || resourceHubLoggedIn) && (
                <button
                  type="button"
                  onClick={async () => {
                    logoutResourceHub();
                    await signOut();
                    navigate('/');
                  }}
                  className="rounded-full border border-[#C8C5BA] bg-white px-5 py-3 font-semibold text-gray-800 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                  ออกจากระบบ
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={`mx-auto w-full max-w-[1440px] flex-1 px-6 pb-24 ${isDetailView ? 'pt-8' : 'pt-4'}`}>
        <Routes>
          <Route path="/resourcehub" element={<ProtectedLayout><ToolsPage /></ProtectedLayout>} />
          <Route path="/updates" element={<ProtectedLayout><UpdatesPage /></ProtectedLayout>} />
          <Route path="/tool/:toolId" element={<ProtectedLayout><ToolDetailPage /></ProtectedLayout>} />
          <Route path="/update/:updateId" element={<ProtectedLayout><UpdateDetailPage /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-[#D6D4CC] bg-white/70 py-12 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <BrandLogo className="text-[24px]" tone="dark" />
          <div className="text-sm font-medium text-gray-700">© 2008 MindDoJo CO., LTD. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
