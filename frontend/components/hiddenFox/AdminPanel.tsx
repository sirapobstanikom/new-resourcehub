import React, { useRef, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  CircleCheckBig,
  Database,
  Info,
  Map as MapIcon,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Users,
  X,
  Settings,
} from 'lucide-react';
import { HIDDEN_FOX_MAP_URL } from './constants';
import type { GameMap, GameSettings, LeaderboardEntry } from './types';

type AdminTab = 'general' | 'maps' | 'leaderboard' | 'system';

interface Props {
  settings: GameSettings;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onDeleteLeaderboardEntry: (index: number) => void;
  onResetLeaderboard: () => void;
}

const AdminPanel: React.FC<Props> = ({
  settings,
  leaderboard,
  onClose,
  onUpdateSettings,
  onDeleteLeaderboardEntry,
  onResetLeaderboard,
}) => {
  const [tab, setTab] = useState<AdminTab>('general');
  const [draft, setDraft] = useState(settings);
  const [editingMap, setEditingMap] = useState<GameMap | null>(null);
  const mapPreviewRef = useRef<HTMLDivElement>(null);

  const saveAll = () => {
    onUpdateSettings(draft);
    alert('All settings and maps saved!');
  };

  const addMap = () => {
    setEditingMap({
      id: `map-${Date.now()}`,
      name: 'New Map',
      url: HIDDEN_FOX_MAP_URL,
      wolfPositions: [],
    });
  };

  const commitMapEdit = () => {
    if (!editingMap) return;
    const exists = draft.maps.find((m) => m.id === editingMap.id);
    const maps = exists
      ? draft.maps.map((m) => (m.id === editingMap.id ? editingMap : m))
      : [...draft.maps, editingMap];
    setDraft({ ...draft, maps });
    setEditingMap(null);
  };

  const deleteMap = (id: string) => {
    if (draft.maps.length <= 1) {
      alert('Cannot delete the last map.');
      return;
    }
    if (!confirm('Delete this map?')) return;
    const maps = draft.maps.filter((m) => m.id !== id);
    const activeMapId = id === draft.activeMapId ? maps[0].id : draft.activeMapId;
    setDraft({ ...draft, maps, activeMapId });
  };

  const moveMap = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= draft.maps.length) return;
    const maps = [...draft.maps];
    [maps[index], maps[next]] = [maps[next], maps[index]];
    setDraft({ ...draft, maps });
  };

  const handleMapPreviewClick = (e: React.MouseEvent) => {
    if (!editingMap || !mapPreviewRef.current) return;
    const rect = mapPreviewRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    const hit = editingMap.wolfPositions.findIndex(
      (p) => Math.abs(p.x - x) < 4 && Math.abs(p.y - y) < 4
    );
    if (hit !== -1) {
      setEditingMap({
        ...editingMap,
        wolfPositions: editingMap.wolfPositions.filter((_, i) => i !== hit),
      });
    } else {
      setEditingMap({
        ...editingMap,
        wolfPositions: [...editingMap.wolfPositions, { x, y }],
      });
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: AdminTab; label: string; icon: React.FC<{ size?: number }> }) => (
    <button
      type="button"
      className={`hf-admin-nav-item ${tab === id ? 'active' : ''}`}
      onClick={() => {
        setTab(id);
        setEditingMap(null);
      }}
    >
      <Icon size={20} />
      <span>{label}</span>
      <ChevronRight size={16} className="hf-admin-desktop-only" />
    </button>
  );

  return (
    <div className="hf-admin-overlay">
      <div className="hf-admin-container">
        <aside className="hf-admin-sidebar">
          <div className="hf-admin-brand">
            <ShieldAlert color="#facc15" size={28} />
            <div className="hf-admin-brand-text">
              <h1>HIDDEN FOX</h1>
              <span>Admin Panel</span>
            </div>
            <button type="button" className="hf-admin-mobile-only hf-admin-close-mobile" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <nav className="hf-admin-nav">
            <NavItem id="general" label="Config" icon={Settings} />
            <NavItem id="maps" label="Map Editor" icon={MapIcon} />
            <NavItem id="leaderboard" label="Players" icon={Users} />
            <NavItem id="system" label="System" icon={Database} />
          </nav>
          <div className="hf-admin-desktop-only hf-admin-sidebar-footer">
            <button type="button" className="hf-admin-exit" onClick={onClose}>
              <X size={18} />
              <span>Close Panel</span>
            </button>
          </div>
        </aside>

        <main className="hf-admin-main">
          <header className="hf-admin-main-header">
            <h2>{editingMap ? 'Editing Map' : tab.toUpperCase()}</h2>
            <div className="hf-admin-desktop-only hf-admin-stat-pill">
              <BarChart3 size={14} />
              <span>Maps: {draft.maps.length}</span>
            </div>
          </header>

          <div className="hf-admin-content-scroll">
            {editingMap ? (
              <div className="hf-admin-map-editor">
                <div className="hf-admin-editor-controls">
                  <label>
                    Map Name
                    <input
                      value={editingMap.name}
                      onChange={(e) => setEditingMap({ ...editingMap, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Image URL (from public or web)
                    <input
                      value={editingMap.url}
                      onChange={(e) => setEditingMap({ ...editingMap, url: e.target.value })}
                    />
                  </label>
                  <div className="hf-admin-info-box">
                    <Info size={16} />
                    <span>Click on map to add/remove fox hide spots.</span>
                  </div>
                </div>
                <div
                  className="hf-admin-map-preview"
                  ref={mapPreviewRef}
                  onClick={handleMapPreviewClick}
                  onKeyDown={() => {}}
                  role="presentation"
                >
                  <img
                    src={editingMap.url}
                    alt="Preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/800x450?text=Invalid+Image+URL';
                    }}
                  />
                  {editingMap.wolfPositions.map((pos, i) => (
                    <div
                      key={`${pos.x}-${pos.y}`}
                      className="hf-admin-marker"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <div className="hf-admin-dot" />
                      <span className="hf-admin-marker-label">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="hf-admin-editor-actions">
                  <button type="button" className="hf-admin-save" onClick={commitMapEdit}>
                    <CircleCheckBig size={18} /> DONE &amp; KEEP CHANGES
                  </button>
                  <button type="button" className="hf-admin-cancel" onClick={() => setEditingMap(null)}>
                    CANCEL
                  </button>
                </div>
              </div>
            ) : tab === 'general' ? (
              <div className="hf-admin-tab">
                <div className="hf-admin-card">
                  <h3>Campaign Overview</h3>
                  <div className="hf-admin-stats-grid">
                    <div>
                      <span className="hf-admin-label">TOTAL MISSIONS</span>
                      <span className="hf-admin-value">{draft.maps.length}</span>
                    </div>
                    <div>
                      <span className="hf-admin-label">TOTAL TARGETS</span>
                      <span className="hf-admin-value">
                        {draft.maps.reduce((n, m) => n + m.wolfPositions.length, 0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hf-admin-card">
                  <h3>Global Rules</h3>
                  <p className="hf-admin-hint">These settings apply to every level in the campaign.</p>
                  <label>
                    Max Foxes per Round
                    <div className="hf-admin-range">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={draft.wolfCount}
                        onChange={(e) => setDraft({ ...draft, wolfCount: parseInt(e.target.value, 10) })}
                      />
                      <span>{draft.wolfCount}</span>
                    </div>
                  </label>
                  <label>
                    Mission Time Limit (s)
                    <div className="hf-admin-range">
                      <input
                        type="range"
                        min={5}
                        max={120}
                        value={draft.timeLimit}
                        onChange={(e) => setDraft({ ...draft, timeLimit: parseInt(e.target.value, 10) })}
                      />
                      <span>{draft.timeLimit}s</span>
                    </div>
                  </label>
                  <label>
                    Detection Precision (Higher = Easier)
                    <div className="hf-admin-range">
                      <input
                        type="range"
                        min={1}
                        max={15}
                        value={draft.precision}
                        onChange={(e) => setDraft({ ...draft, precision: parseInt(e.target.value, 10) })}
                      />
                      <span>{draft.precision}px</span>
                    </div>
                  </label>
                  <button type="button" className="hf-admin-save" onClick={saveAll}>
                    <Save size={18} /> SAVE ALL CHANGES
                  </button>
                </div>
              </div>
            ) : tab === 'maps' ? (
              <div className="hf-admin-tab">
                <div className="hf-admin-card">
                  <div className="hf-admin-card-header">
                    <h3>Manage Maps</h3>
                    <button type="button" className="hf-admin-add" onClick={addMap}>
                      <Plus size={16} /> ADD NEW
                    </button>
                  </div>
                  <div className="hf-admin-map-grid">
                    {draft.maps.map((map, idx) => (
                      <div key={map.id} className="hf-admin-map-card">
                        <div className="hf-admin-map-thumb">
                          <img src={map.url} alt="" />
                          <span className="hf-admin-level-badge">LVL {idx + 1}</span>
                        </div>
                        <div className="hf-admin-map-info">
                          <h4>{map.name}</h4>
                          <p>{map.wolfPositions.length} Fox Hide Spots</p>
                        </div>
                        <div className="hf-admin-map-actions">
                          <button type="button" disabled={idx === 0} onClick={() => moveMap(idx, -1)}>
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.maps.length - 1}
                            onClick={() => moveMap(idx, 1)}
                          >
                            ▼
                          </button>
                          <button type="button" onClick={() => setEditingMap(map)}>
                            EDIT
                          </button>
                          <button type="button" className="danger" onClick={() => deleteMap(map.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="hf-admin-save" style={{ marginTop: 20 }} onClick={saveAll}>
                    <Save size={18} /> SAVE ALL CHANGES
                  </button>
                </div>
              </div>
            ) : tab === 'leaderboard' ? (
              <div className="hf-admin-tab">
                <div className="hf-admin-card">
                  <table className="hf-admin-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, idx) => (
                        <tr key={`${entry.name}-${entry.date}`}>
                          <td>#{idx + 1}</td>
                          <td className="bold">{entry.name}</td>
                          <td>{entry.time}</td>
                          <td>
                            <button type="button" className="hf-admin-delete" onClick={() => onDeleteLeaderboardEntry(idx)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="hf-admin-tab">
                <div className="hf-admin-danger">
                  <h3>Danger Zone</h3>
                  <div className="hf-admin-danger-item">
                    <div>
                      <strong>Reset Leaderboard</strong>
                      <p>Wipe all scores</p>
                    </div>
                    <button type="button" className="hf-admin-danger-btn" onClick={onResetLeaderboard}>
                      RESET
                    </button>
                  </div>
                  <div className="hf-admin-danger-item">
                    <div>
                      <strong>Factory Reset</strong>
                      <p>Wipe all data and maps</p>
                    </div>
                    <button
                      type="button"
                      className="hf-admin-danger-btn"
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                    >
                      WIPE ALL
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
