export type LetterStatus = 'correct' | 'present' | 'absent';
export type KeyStatus = LetterStatus | 'unused';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

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
}): string {
  const { title, feedback, attempt, url } = opts;
  const emojiFor: Record<LetterStatus, string> = {
    correct: '🟩',
    present: '🟨',
    absent: '⬛',
  };
  const grid = feedback.map((row) => row.map((s) => emojiFor[s]).join('')).join('\n');
  const scoreLabel = attempt ? `${attempt}/6` : 'X/6';
  return `${title} ${scoreLabel}\n\n${grid}\n\n${url}`;
}
