import React from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from './types';

interface Props {
  entries: LeaderboardEntry[];
}

const LeaderboardPanel: React.FC<Props> = ({ entries }) => (
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
    <div className="leaderboard-body">
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>
            No players yet.
            <br />
            Be the first to play!
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="rank-col">RANK</th>
                <th className="name-col">NICKNAME</th>
                <th className="score-col">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={`${entry.name}-${entry.date}`} className={`rank-row ${idx < 3 ? `top-${idx + 1}` : ''}`}>
                  <td className="rank">
                    <div className="rank-badge">{idx + 1}</div>
                  </td>
                  <td className="name">
                    <span>{entry.name}</span>
                  </td>
                  <td className="time">
                    <div className="score-value">{entry.time.toLocaleString()}</div>
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
      .name span { font-weight: 700; color: var(--white); }
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

export default LeaderboardPanel;
