import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';
import { KEYBOARD_ROWS } from '../lib/wordle.ts';
import type { KeyStatus } from '../lib/wordle.ts';

const KEY_COLORS: Record<KeyStatus, string> = {
  correct: 'bg-emerald-600 text-white',
  present: 'bg-amber-500 text-stone-950',
  absent: 'bg-stone-800 text-stone-500',
  unused: 'bg-stone-700 text-stone-100 hover:bg-stone-600',
};

interface KeyboardProps {
  keyStatuses: Record<string, KeyStatus>;
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

export const Keyboard: React.FC<KeyboardProps> = ({ keyStatuses, onKeyPress, disabled }) => {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-1.5 select-none">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACKSPACE';
            const status = keyStatuses[key] || 'unused';
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onKeyPress(key)}
                className={`${isWide ? 'flex-[1.6] text-[10px]' : 'flex-1 text-xs sm:text-sm'} h-12 sm:h-14 rounded-md font-bold uppercase flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${KEY_COLORS[status]}`}
              >
                {key === 'BACKSPACE' ? (
                  <Delete className="w-4 h-4" />
                ) : key === 'ENTER' ? (
                  <CornerDownLeft className="w-4 h-4" />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
