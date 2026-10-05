import React from 'react';
import { MAX_GUESSES, WORD_LENGTH } from '../lib/wordle.ts';
import type { LetterStatus } from '../lib/wordle.ts';

const TILE_COLORS: Record<LetterStatus, string> = {
  correct: 'bg-emerald-600 border-emerald-600 text-white',
  present: 'bg-amber-500 border-amber-500 text-stone-950',
  absent: 'bg-stone-800 border-stone-800 text-stone-400',
};

interface BoardProps {
  guesses: string[];
  feedback: LetterStatus[][];
  currentGuess: string;
  shakeRow: number | null;
  justSubmittedRow: number | null;
}

export const Board: React.FC<BoardProps> = ({ guesses, feedback, currentGuess, shakeRow, justSubmittedRow }) => {
  const rows = Array.from({ length: MAX_GUESSES }, (_, rowIdx) => {
    const isActiveRow = rowIdx === guesses.length;
    const word = isActiveRow ? currentGuess : guesses[rowIdx] || '';
    const rowFeedback = feedback[rowIdx];

    return (
      <div
        key={rowIdx}
        className={`grid grid-cols-5 gap-1.5 ${shakeRow === rowIdx ? 'animate-shake' : ''} ${
          justSubmittedRow === rowIdx ? 'animate-row-bounce' : ''
        }`}
      >
        {Array.from({ length: WORD_LENGTH }, (_, colIdx) => {
          const letter = word[colIdx] || '';
          const status = rowFeedback?.[colIdx];
          const hasLetter = Boolean(letter);
          const colorClasses = status
            ? TILE_COLORS[status]
            : hasLetter
            ? 'bg-transparent border-stone-500 text-stone-100'
            : 'bg-transparent border-stone-800 text-stone-100';

          return (
            <div
              key={colIdx}
              className={`relative w-full aspect-square rounded-md border-2 flex items-center justify-center font-display font-bold text-2xl sm:text-3xl uppercase select-none ${colorClasses}`}
              style={status ? { animationDelay: `${colIdx * 80}ms` } : undefined}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  });

  return <div className="flex flex-col gap-1.5 w-full max-w-[340px] mx-auto">{rows}</div>;
};
