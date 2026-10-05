import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';
import { KEYBOARD_ROWS } from '../lib/wordle.ts';
import type { KeyStatus } from '../lib/wordle.ts';

const KEY_COLORS: Record<KeyStatus, string> = {
  correct: 'bg-correct text-paper',
  present: 'bg-present text-ink',
  absent: 'bg-absent text-faint',
  unused: 'bg-surface-high text-paper hover:bg-rule',
};

interface KeyboardProps {
  keyStatuses: Record<string, KeyStatus>;
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

export const Keyboard: React.FC<KeyboardProps> = ({ keyStatuses, onKeyPress, disabled }) => {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-1.5 sm:gap-2 select-none">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 sm:gap-2">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === 'BACKSPACE';
            const status = keyStatuses[key] || 'unused';
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onKeyPress(key)}
                className={`${isWide ? 'flex-[1.6] text-[10px]' : 'flex-1 text-xs sm:text-sm'} h-12 sm:h-14 rounded-md font-semibold uppercase flex items-center justify-center transition-all duration-100 cursor-pointer active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${KEY_COLORS[status]}`}
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
