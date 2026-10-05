import React from 'react';
import { X } from 'lucide-react';

export const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <h2 className="font-display font-bold text-stone-100">How to Play</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-stone-300">
          Guess the word in 6 tries. Each guess must be a real 5-letter word. After each guess, the tiles change
          color to show how close you were.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center font-display font-bold text-white">
              W
            </div>
            <span className="text-stone-300">The letter is in the word, in the right spot.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-500 flex items-center justify-center font-display font-bold text-stone-950">
              O
            </div>
            <span className="text-stone-300">The letter is in the word, wrong spot.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-stone-800 flex items-center justify-center font-display font-bold text-stone-400">
              R
            </div>
            <span className="text-stone-300">The letter isn't in the word at all.</span>
          </div>
        </div>
        <div className="pt-2 border-t border-stone-800 text-xs text-stone-400 space-y-1">
          <p>
            <strong className="text-stone-200">Daily Challenge</strong> — one word a day, the same for every
            player. Keep your streak alive by playing every day.
          </p>
          <p>
            <strong className="text-stone-200">Practice</strong> — one warm-up round a day, so you can limber up
            before you commit to the daily word.
          </p>
          <p>
            <strong className="text-stone-200">Speed Leaderboard</strong> — your timer starts the moment you open
            the daily puzzle. Solve it fastest to top today's board, or set an all-time personal best.
          </p>
          <p>
            Every 7-day streak earns you a <strong className="text-stone-200">Streak Freeze</strong> (up to 2) —
            it quietly covers one missed day so your streak survives.
          </p>
        </div>
      </div>
    </div>
  );
};
