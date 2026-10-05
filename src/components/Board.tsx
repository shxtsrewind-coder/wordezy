import React from 'react';
import { MAX_GUESSES, WORD_LENGTH } from '../lib/wordle.ts';
import type { LetterStatus } from '../lib/wordle.ts';

const TILE_COLORS: Record<LetterStatus, string> = {
  correct: 'bg-correct border-correct text-paper',
  present: 'bg-present border-present text-ink',
  absent: 'bg-absent border-absent text-muted',
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
    const isRevealing = rowIdx === justSubmittedRow;
    const word = isActiveRow ? currentGuess : guesses[rowIdx] || '';
    const rowFeedback = feedback[rowIdx];

    return (
      <div
        key={rowIdx}
        className={`grid grid-cols-5 gap-1.5 sm:gap-2 ${shakeRow === rowIdx ? 'animate-shake' : ''}`}
      >
        {Array.from({ length: WORD_LENGTH }, (_, colIdx) => {
          const letter = word[colIdx] || '';
          const status = rowFeedback?.[colIdx];
          const hasLetter = Boolean(letter);
          const colorClasses = status
            ? TILE_COLORS[status]
            : hasLetter
            ? 'bg-transparent border-faint text-paper scale-[1.04]'
            : isActiveRow
            ? 'bg-transparent border-rule text-paper'
            : 'bg-transparent border-rule/60 text-paper';

          return (
            <div
              key={colIdx}
              className={`relative w-full aspect-square rounded-[7px] border-2 flex items-center justify-center font-display font-semibold text-2xl sm:text-3xl uppercase select-none transition-[transform,background-color,border-color] duration-150 ${colorClasses} ${
                isRevealing && status ? 'animate-tile-flip' : ''
              } ${hasLetter && !status ? 'animate-tile-pop' : ''}`}
              style={isRevealing && status ? { animationDelay: `${colIdx * 220}ms`, animationFillMode: 'backwards' } : undefined}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  });

  return <div className="flex flex-col gap-1.5 sm:gap-2 w-full max-w-[320px] sm:max-w-[380px] mx-auto">{rows}</div>;
};
