import React, { useEffect, useState } from 'react';
import { X, Share2, Snowflake } from 'lucide-react';

export interface ProfileStats {
  games_played: number;
  games_won: number;
  current_streak: number;
  max_streak: number;
  streak_freezes: number;
  guess_distribution: number[];
}

function msUntilNextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  return next.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface StatsModalProps {
  stats: ProfileStats | null;
  onClose: () => void;
  shareText?: string | null;
  showCountdown?: boolean;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose, shareText, showCountdown }) => {
  const [countdown, setCountdown] = useState(msUntilNextUtcMidnight());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!showCountdown) return;
    const id = setInterval(() => setCountdown(msUntilNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, [showCountdown]);

  const winPct = stats && stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
  const maxDist = stats ? Math.max(1, ...stats.guess_distribution) : 1;

  const handleShare = async () => {
    if (!shareText) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share sheet — ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface border border-rule rounded-lg p-5 space-y-5 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h2 className="font-display font-semibold text-paper">Statistics</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-paper cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!stats ? (
          <p className="text-sm text-muted text-center py-4">Play your first round to start tracking stats.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-2xl font-semibold font-mono text-paper">{stats.games_played}</div>
                <div className="text-[11px] text-muted">Played</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono text-paper">{winPct}</div>
                <div className="text-[11px] text-muted">Win %</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono text-correct">{stats.current_streak}</div>
                <div className="text-[11px] text-muted">Streak</div>
              </div>
              <div>
                <div className="text-2xl font-semibold font-mono text-paper">{stats.max_streak}</div>
                <div className="text-[11px] text-muted">Max</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-present">
              <Snowflake className="w-3.5 h-3.5" />
              <span>
                {stats.streak_freezes} streak freeze{stats.streak_freezes === 1 ? '' : 's'} available
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[11px] font-mono text-muted">Guess distribution</h3>
              {stats.guess_distribution.map((count, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted font-mono">{i + 1}</span>
                  <div className="flex-1 h-5 bg-absent rounded-[4px] overflow-hidden">
                    <div
                      className="h-full bg-correct flex items-center justify-end px-1.5 text-[11px] font-mono text-paper min-w-[22px]"
                      style={{ width: `${Math.max(8, (count / maxDist) * 100)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showCountdown && (
          <div className="pt-3 border-t border-rule flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted">Next word</div>
              <div className="font-mono font-semibold text-paper">{formatCountdown(countdown)}</div>
            </div>
            {shareText && (
              <button
                type="button"
                onClick={handleShare}
                className="py-2 px-4 rounded-md bg-correct hover:bg-correct-dim text-paper text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied' : 'Share'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
