import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, BarChart3 } from 'lucide-react';
import { supabase, ensureSession, parseSupabaseError } from '../lib/supabase.ts';
import { ANSWER_WORDS } from '../data/answers.ts';
import { computeFeedback, buildShareText } from '../lib/wordle.ts';
import type { RoundState, SubmitResult } from '../hooks/useWordleGame.ts';
import { emptyRoundState, useWordleGame } from '../hooks/useWordleGame.ts';
import { Board } from '../components/Board.tsx';
import { Keyboard } from '../components/Keyboard.tsx';
import { Toast } from '../components/Toast.tsx';
import { HelpModal } from '../components/HelpModal.tsx';
import { StatsModal } from '../components/StatsModal.tsx';
import type { ProfileStats } from '../components/StatsModal.tsx';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomAnswer(): string {
  return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
}

export const GamePage: React.FC = () => {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [dailyRound, setDailyRound] = useState<RoundState>(emptyRoundState());
  const [practiceRound, setPracticeRound] = useState<RoundState>(emptyRoundState());
  const [practiceWord, setPracticeWord] = useState(() => randomAnswer());
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const challengeDate = useRef(todayUtc());

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('games_played, games_won, current_streak, max_streak, streak_freezes, guess_distribution')
      .maybeSingle();
    if (data) setProfile(data as ProfileStats);
  }, []);

  // Boot: sign in anonymously if needed, then load today's daily state + profile.
  useEffect(() => {
    (async () => {
      try {
        await ensureSession();
        const { data, error } = await supabase.rpc('wordlock_get_today', { p_date: challengeDate.current });
        if (error) throw error;
        if (data) {
          setDailyRound({
            guesses: (data.guesses as string[]) || [],
            feedback: (data.feedback as any[]) || [],
            status: data.status === 'not_started' ? 'in_progress' : data.status,
            solution: data.solution || null,
          });
        }
        await refreshProfile();
      } catch (err) {
        console.error('Failed to load today’s round:', err);
      } finally {
        setInitializing(false);
      }
    })();
  }, [refreshProfile]);

  const resolveDailyGuess = useCallback(
    async (guess: string): Promise<SubmitResult> => {
      const { data, error } = await supabase.rpc('wordlock_submit_guess', {
        p_date: challengeDate.current,
        p_guess: guess,
      });
      if (error) throw new Error(await parseSupabaseError(error));
      if (data.status !== 'in_progress') {
        refreshProfile();
      }
      return {
        feedback: data.feedback,
        status: data.status,
        solution: data.solution || null,
      };
    },
    [refreshProfile]
  );

  const resolvePracticeGuess = useCallback(
    async (guess: string): Promise<SubmitResult> => {
      const feedback = computeFeedback(guess, practiceWord);
      const won = guess === practiceWord;
      const nextAttempt = practiceRound.guesses.length + 1;
      const status = won ? 'won' : nextAttempt >= 6 ? 'lost' : 'in_progress';
      return { feedback, status, solution: status !== 'in_progress' ? practiceWord : null };
    },
    [practiceWord, practiceRound.guesses.length]
  );

  const dailyGame = useWordleGame(dailyRound, setDailyRound, resolveDailyGuess);
  const practiceGame = useWordleGame(practiceRound, setPracticeRound, resolvePracticeGuess);

  const active = mode === 'daily' ? dailyGame : practiceGame;
  const activeRound = mode === 'daily' ? dailyRound : practiceRound;

  // Physical keyboard support
  useEffect(() => {
    if (showHelp || showStats) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        active.onKeyPress(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, showHelp, showStats]);

  const startNewPracticeRound = () => {
    setPracticeWord(randomAnswer());
    setPracticeRound(emptyRoundState());
  };

  const shareText = useMemo(() => {
    if (mode !== 'daily' || dailyRound.status === 'in_progress') return null;
    return buildShareText({
      title: `WordLock ${challengeDate.current}`,
      feedback: dailyRound.feedback,
      attempt: dailyRound.status === 'won' ? dailyRound.guesses.length : null,
      url: 'https://wordlock.bgameworld.com',
    });
  }, [mode, dailyRound]);

  if (initializing) {
    return <div className="min-h-screen bg-[#0c0a09]" />;
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-4 py-3 flex items-center justify-between max-w-xl w-full mx-auto">
        <div className="flex items-center gap-1.5 font-display font-bold text-lg tracking-wide">
          <span className="text-emerald-500">Word</span>
          <span className="text-amber-400">Lock</span>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'daily' && dailyRound.status !== 'in_progress' && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded">
              🔥 {profile?.current_streak ?? 0}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-full hover:bg-stone-800 text-stone-300 cursor-pointer"
            aria-label="How to play"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="p-2 rounded-full hover:bg-stone-800 text-stone-300 cursor-pointer"
            aria-label="Statistics"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="flex items-center justify-center gap-2 py-3">
        <button
          type="button"
          onClick={() => setMode('daily')}
          className={`py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
            mode === 'daily' ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-stone-400 border border-stone-800'
          }`}
        >
          Daily Challenge
        </button>
        <button
          type="button"
          onClick={() => setMode('practice')}
          className={`py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
            mode === 'practice' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-400 border border-stone-800'
          }`}
        >
          Practice
        </button>
      </div>

      {/* Board */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-6">
        <Board
          guesses={activeRound.guesses}
          feedback={activeRound.feedback}
          currentGuess={active.currentGuess}
          shakeRow={active.shakeRow}
          justSubmittedRow={active.justSubmittedRow}
        />

        {activeRound.status !== 'in_progress' && (
          <div className="text-center space-y-2 animate-tile-pop">
            <p className={`font-display font-bold text-lg ${activeRound.status === 'won' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {activeRound.status === 'won' ? 'You got it!' : `The word was ${activeRound.solution?.toUpperCase()}`}
            </p>
            {mode === 'practice' ? (
              <button
                type="button"
                onClick={startNewPracticeRound}
                className="py-2 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer"
              >
                Play Another
              </button>
            ) : (
              <p className="text-xs text-stone-400">Come back tomorrow for a new word.</p>
            )}
          </div>
        )}

        <Keyboard
          keyStatuses={active.keyStatuses}
          onKeyPress={active.onKeyPress}
          disabled={activeRound.status !== 'in_progress' || active.submitting}
        />
      </main>

      <Toast message={active.toast} />
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && (
        <StatsModal
          stats={profile}
          onClose={() => setShowStats(false)}
          shareText={shareText}
          showCountdown={mode === 'daily'}
        />
      )}
    </div>
  );
};
