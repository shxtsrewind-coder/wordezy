import React from 'react';
import { X } from 'lucide-react';

export const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface border border-rule rounded-lg p-5 space-y-4 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h2 className="font-display font-semibold text-paper">How to play</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-paper cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-paper/90">
          Guess the word in 6 tries. Each guess must be a real 5-letter word. After each guess, the tiles change
          color to show how close you were.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-correct flex items-center justify-center font-display font-semibold text-paper">
              W
            </div>
            <span className="text-paper/80">The letter is in the word, in the right spot.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-present flex items-center justify-center font-display font-semibold text-ink">
              O
            </div>
            <span className="text-paper/80">The letter is in the word, wrong spot.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-absent flex items-center justify-center font-display font-semibold text-faint">
              R
            </div>
            <span className="text-paper/80">The letter isn't in the word at all.</span>
          </div>
        </div>
        <div className="pt-2 border-t border-rule text-xs text-muted space-y-1.5">
          <p>
            <strong className="text-paper font-medium">Daily Challenge</strong> — one word a day, the same for
            every player. Keep your streak alive by playing every day.
          </p>
          <p>
            <strong className="text-paper font-medium">Practice</strong> — one warm-up round a day, so you can
            limber up before you commit to the daily word.
          </p>
          <p>
            <strong className="text-paper font-medium">Speed leaderboard</strong> — your timer starts the moment
            you open the daily puzzle. Solve it fastest to top today's board, or set an all-time personal best.
          </p>
          <p>
            Every 7-day streak earns you a <strong className="text-paper font-medium">streak freeze</strong> (up
            to 2) — it quietly covers one missed day so your streak survives.
          </p>
        </div>
      </div>
    </div>
  );
};
