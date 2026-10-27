export type LetterStatus = 'correct' | 'present' | 'absent';
export type KeyStatus = LetterStatus | 'unused';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Day 1 of the shared BGameWorld daily numbering (same as Mergezy and Warmezy). */
export const LAUNCH_DATE = '2026-10-11';
export function puzzleNumber(date: string): number {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(LAUNCH_DATE + 'T00:00:00Z')) / 86400000) + 1;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

/**
 * Hard mode: every revealed hint must be used in later guesses. Green letters
 * must stay in their spot; yellow letters must appear somewhere (as many times
 * as they were revealed). Returns the message to show, or null if the guess is
 * allowed. Checks greens first, in position order, like the classic game.
 */
export function hardModeViolation(guess: string, guesses: string[], feedback: LetterStatus[][]): string | null {
  const g = guess.toLowerCase();
  for (let r = 0; r < guesses.length; r++) {
    const prev = guesses[r].toLowerCase();
    const fb = feedback[r] || [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (fb[i] === 'correct' && g[i] !== prev[i]) {
        return `${ORDINALS[i]} letter must be ${prev[i].toUpperCase()}`;
      }
    }
    const need: Record<string, number> = {};
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (fb[i] === 'correct' || fb[i] === 'present') need[prev[i]] = (need[prev[i]] || 0) + 1;
    }
    for (const [letter, count] of Object.entries(need)) {
      const have = g.split('').filter((c) => c === letter).length;
      if (have < count) return `Guess must contain ${letter.toUpperCase()}`;
    }
  }
  return null;
}

export const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

/**
 * Classic two-pass Wordle feedback: exact matches first (so a letter can't
 * be "stolen" by an earlier present-match), then present/absent for what's
 * left, respecting duplicate-letter counts. Mirrors the server-side
 * `wordlock_submit_guess` RPC exactly, so Daily and Practice feel identical.
 */
export function computeFeedback(guess: string, answer: string): LetterStatus[] {
  const g = guess.toLowerCase().split('');
  const a = answer.toLowerCase().split('');
  const status: LetterStatus[] = new Array(WORD_LENGTH).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === a[i]) {
      status[i] = 'correct';
    } else {
      remaining[a[i]] = (remaining[a[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (status[i] === 'correct') continue;
    const letter = g[i];
    if (remaining[letter] > 0) {
      status[i] = 'present';
      remaining[letter] -= 1;
    } else {
      status[i] = 'absent';
    }
  }
  return status;
}

/** Merge a letter's new status into the keyboard's best-known status for it. */
export function mergeKeyStatus(current: KeyStatus, next: LetterStatus): KeyStatus {
  const rank: Record<KeyStatus, number> = { unused: 0, absent: 1, present: 2, correct: 3 };
  return rank[next] >= rank[current] ? next : current;
}

export function buildKeyStatuses(guesses: string[], feedback: LetterStatus[][]): Record<string, KeyStatus> {
  const map: Record<string, KeyStatus> = {};
  guesses.forEach((word, gi) => {
    word
      .toUpperCase()
      .split('')
      .forEach((letter, li) => {
        const next = feedback[gi]?.[li];
        if (!next) return;
        map[letter] = mergeKeyStatus(map[letter] || 'unused', next);
      });
  });
  return map;
}

/** Builds the shareable emoji-grid result, like classic Wordle's share text. */
export function buildShareText(opts: {
  title: string;
  feedback: LetterStatus[][];
  attempt: number | null; // null = loss
  url: string;
  /** Orange/blue squares to match the high-contrast tiles. */
  highContrast?: boolean;
  /** Marks the score with * when the round was played in hard mode. */
  hardMode?: boolean;
}): string {
  const { title, feedback, attempt, url, highContrast, hardMode } = opts;
  const emojiFor: Record<LetterStatus, string> = {
    correct: highContrast ? '🟧' : '🟩',
    present: highContrast ? '🟦' : '🟨',
    absent: '⬛',
  };
  const grid = feedback.map((row) => row.map((s) => emojiFor[s]).join('')).join('\n');
  const scoreLabel = (attempt ? `${attempt}/6` : 'X/6') + (hardMode ? '*' : '');
  return `${title} ${scoreLabel}\n\n${grid}\n\n${url}`;
}

/** Formats a duration in milliseconds as m:ss (or h:mm:ss past an hour). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
