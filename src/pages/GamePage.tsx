import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, BarChart3, Flame, WifiOff, RefreshCw } from 'lucide-react';
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
  const [authBlocked, setAuthBlocked] = useState<'anonymous_disabled' | 'unknown' | null>(null);
  const challengeDate = useRef(todayUtc());

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('games_played, games_won, current_streak, max_streak, streak_freezes, guess_distribution')
      .maybeSingle();
    if (data) setProfile(data as ProfileStats);
  }, []);

  const boot = useCallback(async () => {
    setInitializing(true);
    setAuthBlocked(null);
    try {
      const session = await ensureSession();
      if (!session.ok) {
        setAuthBlocked(session.reason || 'unknown');
        return;
      }
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
      setAuthBlocked('unknown');
    } finally {
      setInitializing(false);
    }
  }, [refreshProfile]);

  // Boot: sign in anonymously if needed, then load today's daily state + profile.
  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      title: `Wordezy ${challengeDate.current}`,
      feedback: dailyRound.feedback,
      attempt: dailyRound.status === 'won' ? dailyRound.guesses.length : null,
      url: 'https://wordezy.bgameworld.com',
    });
  }, [mode, dailyRound]);

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-1.5">
          {['W', 'O', 'R', 'D'].map((l, i) => (
            <span
              key={i}
              className={`w-9 h-9 rounded-md flex items-center justify-center font-display font-bold text-sm animate-tile-pop ${
                i % 2 === 0 ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-stone-950'
              }`}
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'backwards' }}
            >
              {l}
            </span>
          ))}
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-stone-500">Loading today's puzzle&hellip;</p>
      </div>
    );
  }

  if (authBlocked) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-stone-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/60 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-rose-400" />
        </div>
        <h1 className="font-display font-bold text-lg">Wordezy is briefly unavailable</h1>
        <p className="text-sm text-stone-400 max-w-xs">
          {authBlocked === 'anonymous_disabled'
            ? "We're setting up today's game — please check back in a few minutes."
            : "We couldn't connect to the game right now. Check your connection and try again."}
        </p>
        <button
          type="button"
          onClick={boot}
          className="mt-2 inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-stone-800 hover:bg-stone-700 text-sm font-semibold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-4 py-3 flex items-center justify-between max-w-xl w-full mx-auto">
        <div className="flex items-center gap-1.5 font-display font-bold text-lg tracking-wide">
          <span className="text-emerald-500">Word</span>
          <span className="text-amber-400">ezy</span>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'daily' && (
            <span
              className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded"
              title="Current streak"
            >
              <Flame className="w-3 h-3" />
              {profile?.current_streak ?? 0}
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
      <div className="flex justify-center py-3 px-4">
        <div className="relative flex items-center bg-stone-900 border border-stone-800 rounded-full p-1 w-full max-w-[280px]">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-200 ease-out ${
              mode === 'daily' ? 'translate-x-0 bg-emerald-600' : 'translate-x-[calc(100%+8px)] bg-amber-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setMode('daily')}
            className={`relative z-10 flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
              mode === 'daily' ? 'text-white' : 'text-stone-400'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setMode('practice')}
            className={`relative z-10 flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors ${
              mode === 'practice' ? 'text-stone-950' : 'text-stone-400'
            }`}
          >
            Practice
          </button>
        </div>
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
          <div
            className={`w-full max-w-[320px] sm:max-w-[380px] mx-auto text-center space-y-3 rounded-xl border px-5 py-4 animate-tile-pop ${
              activeRound.status === 'won'
                ? 'bg-emerald-950/40 border-emerald-800/60'
                : 'bg-rose-950/30 border-rose-900/50'
            }`}
          >
            <p className={`font-display font-bold text-lg ${activeRound.status === 'won' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {activeRound.status === 'won'
                ? ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][activeRound.guesses.length - 1] || 'Solved!'
                : `The word was ${activeRound.solution?.toUpperCase()}`}
            </p>
            {activeRound.status === 'won' && (
              <p className="text-xs text-stone-400">
                Solved in {activeRound.guesses.length} / {dailyGame.maxGuesses}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-1">
              {mode === 'practice' ? (
                <button
                  type="button"
                  onClick={startNewPracticeRound}
                  className="py-2 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer transition-colors"
                >
                  Play Another
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowStats(true)}
                    className="py-2 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer transition-colors"
                  >
                    View Stats
                  </button>
                  <p className="text-xs text-stone-500">Next word at midnight UTC</p>
                </>
              )}
            </div>
          </div>
        )}

        <Keyboard
          keyStatuses={active.keyStatuses}
          onKeyPress={active.onKeyPress}
          disabled={activeRound.status !== 'in_progress' || active.submitting}
        />
      </main>

      <Toast message={active.toast} variant={active.toastVariant} />
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
