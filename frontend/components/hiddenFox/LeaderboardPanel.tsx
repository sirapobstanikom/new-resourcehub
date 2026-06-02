import React, { useState } from 'react';
import { Trophy, Zap, Target } from 'lucide-react';
import type { HallOfFameEntry } from '../../services/hiddenFoxSupabase';

interface Props {
  fastest: HallOfFameEntry[];
  accuracy: HallOfFameEntry[];
  loading?: boolean;
  error?: string | null;
}

type Tab = 'fastest' | 'accuracy';

const LeaderboardPanel: React.FC<Props> = ({ fastest, accuracy, loading, error }) => {
  const [tab, setTab] = useState<Tab>('fastest');
  const entries = tab === 'fastest' ? fastest : accuracy;

  return (
    <div className="leaderboard-sidebar-content">
      <div className="leaderboard-header">
        <div className="icon-box">
          <Trophy color="#facc15" size={28} />
        </div>
        <div className="header-text">
          <h2>HALL OF FAME</h2>
          <span>OUR CHAMPIONS</span>
        </div>
      </div>

      <div className="hof-tabs">
        <button
          type="button"
          className={`hof-tab ${tab === 'fastest' ? 'active' : ''}`}
          onClick={() => setTab('fastest')}
        >
          <Zap size={14} />
          เร็วที่สุด
        </button>
        <button
          type="button"
          className={`hof-tab ${tab === 'accuracy' ? 'active' : ''}`}
          onClick={() => setTab('accuracy')}
        >
          <Target size={14} />
          แม่นที่สุด
        </button>
      </div>

      <div className="leaderboard-body">
        {loading ? (
          <div className="empty-state">
            <p>กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p>
              ยังไม่มีผู้เล่น
              <br />
              มาเป็นคนแรก!
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="rank-col">อันดับ</th>
                  <th className="name-col">ชื่อ</th>
                  <th className="score-col">{tab === 'fastest' ? 'เวลา' : 'ความแม่น'}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className={`rank-row ${idx < 3 ? `top-${idx + 1}` : ''}`}>
                    <td className="rank">
                      <div className="rank-badge">{idx + 1}</div>
                    </td>
                    <td className="name">
                      <span>{entry.name}</span>
                      {entry.company ? (
                        <span className="company-tag">{entry.company}</span>
                      ) : null}
                    </td>
                    <td className="time">
                      <div className="score-value">
                        {tab === 'fastest'
                          ? `${entry.completionTimeSec}s`
                          : `${entry.accuracyPercent}%`}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
      .leaderboard-sidebar-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: rgba(12, 12, 16, 0.75);
        border: 3px solid var(--purple-light);
        border-radius: 25px;
        overflow: hidden;
        backdrop-filter: blur(10px);
      }
      .leaderboard-header {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 2px solid var(--purple-light);
      }
      .icon-box {
        background: rgba(250, 204, 21, 0.15);
        padding: 10px;
        border-radius: 15px;
        display: flex;
      }
      .header-text h2 {
        margin: 0;
        font-family: 'Luckiest Guy', cursive;
        color: var(--gold);
        font-size: 1.4rem;
      }
      .header-text span {
        color: var(--purple-light);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 2px;
      }
      .hof-tabs {
        display: flex;
        gap: 8px;
        padding: 12px 15px 0;
      }
      .hof-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 12px;
        border: 2px solid var(--purple-light);
        background: rgba(0, 0, 0, 0.25);
        color: var(--purple-light);
        font-weight: 800;
        font-size: 0.7rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .hof-tab.active {
        background: var(--purple-light);
        color: #fff;
        border-color: var(--gold);
      }
      .leaderboard-body {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      .table-wrapper { width: 100%; }
      .leaderboard-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
      .leaderboard-table th {
        font-size: 0.65rem;
        color: var(--purple-light);
        padding: 0 10px;
        text-transform: uppercase;
        font-weight: 900;
      }
      .score-col { text-align: right; }
      .rank-row { background: rgba(255, 255, 255, 0.05); border-radius: 15px; transition: transform 0.2s; }
      .rank-row td { padding: 12px 10px; }
      .rank-badge {
        width: 32px; height: 32px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 0.9rem;
        color: var(--white);
        border: 1px solid var(--purple-light);
      }
      .name span { font-weight: 700; color: var(--white); display: block; }
      .company-tag {
        display: block;
        font-size: 0.65rem;
        color: var(--purple-light);
        font-weight: 600;
        margin-top: 2px;
      }
      .score-value {
        font-weight: 900; color: var(--neon-green); text-align: right;
        font-family: 'Luckiest Guy', cursive; font-size: 1.1rem;
      }
      .top-1 { background: rgba(250, 204, 21, 0.12); border: 1px solid var(--neon-green); }
      .top-1 .rank-badge { background: var(--neon-green); color: #000; border: none; }
      .top-1 .name span { color: var(--neon-green); }
      .top-1 .score-value { text-shadow: 0 0 10px rgba(250, 204, 21, 0.45); }
      .empty-state { padding: 40px 0; text-align: center; color: var(--purple-light); font-style: italic; }
    `}</style>
    </div>
  );
};

export default LeaderboardPanel;
