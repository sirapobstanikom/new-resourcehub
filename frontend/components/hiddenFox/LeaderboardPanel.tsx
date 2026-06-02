import React from 'react';
import { Trophy, Crown } from 'lucide-react';
import type { HallOfFameEntry } from '../../services/hiddenFoxSupabase';

interface Props {
  entries: HallOfFameEntry[];
  loading?: boolean;
  error?: string | null;
}

const PODIUM_ORDER = [1, 0, 2] as const;

function formatScore(score: number): string {
  return score.toLocaleString();
}

function formatSubStat(entry: HallOfFameEntry): string {
  const time = entry.completionTimeSec > 0 ? `${entry.completionTimeSec}s` : '—';
  return `${time} · ${entry.accuracyPercent}%`;
}

const LeaderboardPanel: React.FC<Props> = ({ entries, loading, error }) => {
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const podiumSlots = PODIUM_ORDER.map((idx) => ({
    rank: idx + 1,
    entry: topThree[idx] ?? null,
  }));

  return (
    <div className="leaderboard-sidebar-content">
      <div className="leaderboard-header">
        <div className="icon-box">
          <Trophy color="#ffd700" size={28} strokeWidth={2.5} />
        </div>
        <div className="header-text">
          <h2>HALL OF FAME</h2>
          <span>เรียงจากคะแนนสูงสุด · เท่ากันดูเวลา</span>
        </div>
      </div>

      <div className="leaderboard-body hof-mode-score">
        {loading ? (
          <div className="empty-state">
            <p>กำลังโหลดอันดับ</p>
            <div className="hof-loading-dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p>
              ยังไม่มีแชมป์
              <br />
              มาเป็นคนแรกที่ขึ้นโพเดียม!
            </p>
          </div>
        ) : (
          <>
            <div className="hof-podium">
              {podiumSlots.map(({ rank, entry }) => (
                <div key={rank} className={`hof-podium-slot rank-${rank}`}>
                  {entry ? (
                    <>
                      <div className="hof-podium-medal" aria-hidden>
                        {rank === 1 ? <Crown size={22} strokeWidth={2.5} /> : rank}
                      </div>
                      <div className="hof-podium-name" title={entry.name}>
                        {entry.name}
                      </div>
                      {entry.company ? (
                        <div className="hof-podium-company" title={entry.company}>
                          {entry.company}
                        </div>
                      ) : null}
                      <div className="hof-podium-stat">{formatScore(entry.totalScore)}</div>
                      <div className="hof-podium-sub">{formatSubStat(entry)}</div>
                    </>
                  ) : (
                    <div className="hof-podium-empty">— ว่าง —</div>
                  )}
                </div>
              ))}
            </div>

            {rest.length > 0 ? (
              <div className="hof-list">
                {rest.map((entry, i) => (
                  <div key={entry.id} className="hof-list-row">
                    <div className="hof-list-rank">{i + 4}</div>
                    <div>
                      <div className="hof-list-name" title={entry.name}>
                        {entry.name}
                      </div>
                      {entry.company ? (
                        <div className="hof-list-company" title={entry.company}>
                          {entry.company}
                        </div>
                      ) : null}
                    </div>
                    <div className="hof-list-stat-block">
                      <div className="hof-list-stat">{formatScore(entry.totalScore)}</div>
                      <div className="hof-list-sub">{formatSubStat(entry)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPanel;
