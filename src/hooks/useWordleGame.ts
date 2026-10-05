import { useCallback, useState } from 'react';
import { GUESS_DICTIONARY } from '../data/dictionary.ts';
import { MAX_GUESSES, WORD_LENGTH, buildKeyStatuses } from '../lib/wordle.ts';
import type { LetterStatus } from '../lib/wordle.ts';
import type { ToastVariant } from '../components/Toast.tsx';

export type GameStatus = 'in_progress' | 'won' | 'lost';

export interface RoundState {
  guesses: string[];
  feedback: LetterStatus[][];
  status: GameStatus;
  solution: string | null;
  /** Milliseconds between the round starting and finishing (Daily only; null until won/lost). */
  durationMs: number | null;
  /** True when this win just beat the player's own best daily solve time. */
  isNewBest: boolean;
}

export interface SubmitResult {
  feedback: LetterStatus[];
  status: GameStatus;
  solution: string | null;
  durationMs?: number | null;
  isNewBest?: boolean;
}

export function emptyRoundState(): RoundState {
  return { guesses: [], feedback: [], status: 'in_progress', solution: null, durationMs: null, isNewBest: false };
}

/**
 * Drives one Wordle-style round (either Daily or Practice). The caller
 * supplies `resolveGuess`, which is the only thing that differs between
 * modes: Practice resolves instantly against a local word, Daily calls the
 * Supabase RPC so the answer never reaches the client until the round ends.
 */
export function useWordleGame(
  round: RoundState,
  setRound: (updater: (prev: RoundState) => RoundState) => void,
  resolveGuess: (guess: string) => Promise<SubmitResult>
) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<ToastVariant>('neutral');
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [justSubmittedRow, setJustSubmittedRow] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((msg: string, durationMs = 1600, variant: ToastVariant = 'neutral') => {
    setToast(msg);
    setToastVariant(variant);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), durationMs);
  }, []);

  const triggerShake = useCallback(() => {
    const row = round.guesses.length;
    setShakeRow(row);
    setTimeout(() => setShakeRow((r) => (r === row ? null : r)), 500);
  }, [round.guesses.length]);

  const onKeyPress = useCallback(
    async (key: string) => {
      if (round.status !== 'in_progress' || submitting) return;

      if (key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === 'ENTER') {
        if (currentGuess.length !== WORD_LENGTH) {
          triggerShake();
          showToast('Not enough letters');
          return;
        }
        if (!GUESS_DICTIONARY.has(currentGuess.toLowerCase())) {
          triggerShake();
          showToast('Not in word list');
          return;
        }

        setSubmitting(true);
        try {
          const result = await resolveGuess(currentGuess.toLowerCase());
          const rowIdx = round.guesses.length;
          setRound((prev) => ({
            guesses: [...prev.guesses, currentGuess.toLowerCase()],
            feedback: [...prev.feedback, result.feedback],
            status: result.status,
            solution: result.solution ?? prev.solution,
            durationMs: result.durationMs ?? prev.durationMs,
            isNewBest: result.isNewBest ?? prev.isNewBest,
          }));
          setCurrentGuess('');
          setJustSubmittedRow(rowIdx);
          setTimeout(() => setJustSubmittedRow((r) => (r === rowIdx ? null : r)), 650);

          if (result.status === 'won') {
            showToast(['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][rowIdx] || 'Solved!', 2200);
          } else if (result.status === 'lost' && result.solution) {
            showToast(result.solution.toUpperCase(), 3200);
          }
        } catch (err: any) {
          showToast(err?.message || 'Something went wrong. Try again.', 2400, 'error');
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Letter key
      if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key);
      }
    },
    [currentGuess, round.status, round.guesses.length, submitting, resolveGuess, setRound, showToast, triggerShake]
  );

  const keyStatuses = buildKeyStatuses(round.guesses, round.feedback);

  return {
    currentGuess,
    setCurrentGuess,
    toast,
    toastVariant,
    shakeRow,
    justSubmittedRow,
    submitting,
    onKeyPress,
    keyStatuses,
    maxGuesses: MAX_GUESSES,
  };
}
