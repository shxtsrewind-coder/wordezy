import React, { useEffect, useState } from 'react';
import { X, Trophy, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { codeToFlagEmoji } from '../lib/countryFlags.ts';
import { formatDuration } from '../lib/wordle.ts';

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  country_code: string | null;
  attempts: number;
  duration_ms: number;
}

type Tab = 'today' | 'alltime';

interface LeaderboardModalProps {
  userId: string | null;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ userId, onClose }) => {
  const [tab, setTab] = useState<Tab>('today');
  const [rows, setRows] = useState<Record<Tab, LeaderboardRow[] | null>>({ today: null, alltime: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (rows[tab] !== null) return;

    setLoading(true);
    setError(null);
    const fn = tab === 'today' ? 'wordlock_daily_speed_leaderboard' : 'wordlock_alltime_speed_leaderboard';
    const args = tab === 'today' ? { p_date: new Date().toISOString().slice(0, 10), board_limit: 50 } : { board_limit: 50 };

    supabase
      .rpc(fn, args)
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError('Could not load the leaderboard. Try again shortly.');
        } else {
          setRows((prev) => ({ ...prev, [tab]: (data as LeaderboardRow[]) || [] }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, rows]);

  const currentRows = rows[tab];
  const myRank = currentRows ? currentRows.findIndex((r) => r.user_id === userId) : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface border border-rule rounded-lg p-5 space-y-4 shadow-xl shadow-black/40 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h2 className="font-display font-semibold text-paper flex items-center gap-2">
            <Trophy className="w-4 h-4 text-present" />
            Speed leaderboard
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-paper cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 bg-ink border border-rule rounded-md p-1">
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`flex-1 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors ${
              tab === 'today' ? 'bg-surface-high text-correct' : 'text-muted'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTab('alltime')}
            className={`flex-1 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors ${
              tab === 'alltime' ? 'bg-surface-high text-present' : 'text-muted'
            }`}
          >
            All-time
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {loading && (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-rule border-t-correct rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && <p className="text-xs text-danger text-center py-6">{error}</p>}

          {!loading && !error && currentRows && currentRows.length === 0 && (
            <p className="text-xs text-muted text-center py-8">
              {tab === 'today' ? "No one has solved today's word yet — be the first." : 'No fast solves recorded yet.'}
            </p>
          )}

          {!loading &&
            !error &&
            currentRows &&
            currentRows.map((row, idx) => {
              const isYou = row.user_id === userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div
                  key={row.user_id}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm ${
                    isYou ? 'bg-correct-soft border border-correct-dim/50' : 'hover:bg-surface-high'
                  }`}
                >
                  <span className="w-6 text-center text-xs font-mono text-muted shrink-0">{medal || `#${idx + 1}`}</span>
                  <span className="text-base shrink-0">{codeToFlagEmoji(row.country_code) || '🌐'}</span>
                  <span className={`flex-1 truncate font-medium ${isYou ? 'text-correct' : 'text-paper'}`}>
                    {row.display_name}
                    {isYou && <span className="text-[10px] text-correct/80 font-mono ml-1">(you)</span>}
                  </span>
                  <span className="text-xs text-muted font-mono">{row.attempts}/6</span>
                  <span className="text-xs font-mono font-semibold text-present flex items-center gap-1 shrink-0">
                    <Zap className="w-3 h-3" />
                    {formatDuration(row.duration_ms)}
                  </span>
                </div>
              );
            })}
        </div>

        {!loading && currentRows && myRank === -1 && userId && (
          <p className="text-[11px] text-muted text-center pt-2 border-t border-rule">
            {tab === 'today' ? "Solve today's word to join the race." : 'Win a daily round to join the all-time board.'}
          </p>
        )}
      </div>
    </div>
  );
};
