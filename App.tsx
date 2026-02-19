import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { JOURNEY_DATA, UPDATES_DATA, getToolById, getUpdateById } from './constants';
import { Tool, InnovationUpdate } from './types';
import JourneyCard from './components/JourneyCard';
import UpdateCard from './components/UpdateCard';
import ToolDetail from './components/ToolDetail';
import UpdateDetail from './components/UpdateDetail';
import AIChatModal from './components/AIChatModal';
import LoginPage from './components/LoginPage';
import { isAuthenticated, logout } from './lib/auth';

function ToolsPage() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

  if (!tool) return <Navigate to="/" replace />;

  return (
    <>
      <ToolDetail
        tool={tool}
        onBack={() => navigate(-1)}
        onAskAI={() => setIsAIModalOpen(true)}
      />
      {isAIModalOpen && (
        <AIChatModal toolName={tool.name} onClose={() => setIsAIModalOpen(false)} />
      )}
    </>
  );
}

function UpdateDetailPage() {
  const { updateId } = useParams<{ updateId: string }>();
  const navigate = useNavigate();
  const update = updateId ? getUpdateById(updateId) : undefined;

  if (!update) return <Navigate to="/updates" replace />;

  return (
    <UpdateDetail update={update} onBack={() => navigate(-1)} />
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const App: React.FC = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isDetailView = location.pathname.startsWith('/tool/') || location.pathname.startsWith('/update/');
  const isTools = location.pathname === '/';
  const isUpdates = location.pathname === '/updates';

  if (isLogin) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {!isDetailView && (
        <header className="pt-24 pb-16 px-6 relative">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
                  <span className="text-black font-black text-xl">M</span>
                </div>
                <Link to="/" className="text-2xl font-bold tracking-tighter text-glow hover:opacity-90">
                  MindDoJo
                </Link>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              INNOVATION <span className="text-yellow-400">NEXUS</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12">
              Explore our curated library of strategic frameworks and operational tools designed for modern organizational growth.
            </p>

            <div className="flex justify-center items-center gap-4 flex-wrap">
              <Link
                to="/"
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  isTools
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Operational Tools
              </Link>
              <Link
                to="/updates"
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  isUpdates
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Industry Updates
              </Link>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="px-6 py-3 rounded-xl font-bold bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 max-w-[1440px] mx-auto w-full px-6 pb-24 ${isDetailView ? 'pt-8' : 'pt-12'}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <ToolsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/updates"
            element={
              <ProtectedLayout>
                <UpdatesPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tool/:toolId"
            element={
              <ProtectedLayout>
                <ToolDetailPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/update/:updateId"
            element={
              <ProtectedLayout>
                <UpdateDetailPage />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="py-12 border-t border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-black font-bold text-lg">M</span>
            </div>
            <span className="font-bold tracking-tight">MindDoJo</span>
          </div>
          <div className="text-gray-500 text-sm">
            © 2024 MindDoJo CO., LTD. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
