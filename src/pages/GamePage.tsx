import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, BarChart3, Flame, WifiOff, RefreshCw, Trophy, Lock } from 'lucide-react';
import { supabase, ensureSession, parseSupabaseError } from '../lib/supabase.ts';
import { ANSWER_WORDS } from '../data/answers.ts';
import { computeFeedback, buildShareText, formatDuration } from '../lib/wordle.ts';
import type { RoundState, SubmitResult } from '../hooks/useWordleGame.ts';
import { emptyRoundState, useWordleGame } from '../hooks/useWordleGame.ts';
import { Board } from '../components/Board.tsx';
import { Keyboard } from '../components/Keyboard.tsx';
import { Toast } from '../components/Toast.tsx';
import { HelpModal } from '../components/HelpModal.tsx';
import { StatsModal } from '../components/StatsModal.tsx';
import type { ProfileStats } from '../components/StatsModal.tsx';
import { AuthModal } from '../components/AuthModal.tsx';
import { LeaderboardModal } from '../components/LeaderboardModal.tsx';
import { ACHIEVEMENTS, computeAchievements } from '../lib/achievements.ts';

const PLAY_CHOICE_KEY = 'wordezy_play_choice_completed';
const SEEN_HELP_KEY = 'wordezy_seen_how_to_play';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomAnswer(): string {
  return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
}

type Phase = 'auth_checking' | 'auth_blocked' | 'choice' | 'loading_data' | 'onboarding_help' | 'ready';
type PracticeStatus = 'unknown' | 'checking' | 'allowed' | 'locked' | 'error';

const TILE_MARK_CLASSES = {
  correct: 'bg-correct text-paper',
  present: 'bg-present text-ink',
  absent: 'bg-absent text-faint',
} as const;

/** How long the brand loader lingers on screen, start to finish. A real network
 * round trip is often fast enough that the tiles would pop and vanish before
 * anyone reads them, so the boot sequence below pads out to this floor rather
 * than racing ahead. Kept in step with the cascade timing below. */
const MIN_LOADER_MS = 1800;

/** The tile mark used as both the boot loader and the header wordmark, so the
 * brand is the game's own tiles rather than a bolted-on logotype. Defaults to
 * the compact "WORD" mark for the header; the loader spells the full name,
 * letter by letter, at an unhurried pace. */
const WordmarkTiles: React.FC<{ word?: string; size?: 'sm' | 'lg'; animate?: boolean }> = ({
  word = 'WORD',
  size = 'sm',
  animate = false,
}) => {
  const dims = size === 'lg' ? 'w-8 h-8 text-sm rounded-[5px]' : 'w-6 h-6 text-[11px] rounded-[4px]';
  const pattern: Array<keyof typeof TILE_MARK_CLASSES> = ['correct', 'present', 'correct', 'absent'];
  return (
    <div className="flex items-center gap-1">
      {word.split('').map((letter, i) => {
        const status = pattern[i % pattern.length];
        return (
          <span
            key={i}
            className={`${dims} ${TILE_MARK_CLASSES[status]} flex items-center justify-center font-display font-semibold ${
              animate ? 'animate-tile-pop' : ''
            }`}
            style={
              animate
                ? { animationDelay: `${i * 170}ms`, animationDuration: '260ms', animationFillMode: 'backwards' }
                : undefined
            }
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
};

export const GamePage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('auth_checking');
  const [authBlockedReason, setAuthBlockedReason] = useState<'anonymous_disabled' | 'unknown'>('unknown');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState('Player');

  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [dailyRound, setDailyRound] = useState<RoundState>(emptyRoundState());
  const [practiceRound, setPracticeRound] = useState<RoundState>(emptyRoundState());
  const [practiceWord, setPracticeWord] = useState<string | null>(null);
  const [practiceStatus, setPracticeStatus] = useState<PracticeStatus>('unknown');

  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const challengeDate = useRef(todayUtc());
  const bootStartedAt = useRef(Date.now());

  /** Pads out whatever's left of MIN_LOADER_MS so the brand loader never
   * flashes off before the tile cascade has had a chance to play. A slow
   * connection is unaffected — this only ever adds a wait on the fast path. */
  const waitForMinLoader = useCallback(async () => {
    const remaining = MIN_LOADER_MS - (Date.now() - bootStartedAt.current);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('games_played, games_won, current_streak, max_streak, streak_freezes, guess_distribution')
      .maybeSingle();
    if (data) setProfile(data as ProfileStats);
  }, []);

  const loadGameData = useCallback(async () => {
    setPhase('loading_data');
    try {
      const { data, error } = await supabase.rpc('wordlock_get_today', { p_date: challengeDate.current });
      if (error) throw error;
      if (data) {
        setDailyRound({
          guesses: (data.guesses as string[]) || [],
          feedback: (data.feedback as any[]) || [],
          status: data.status === 'not_started' ? 'in_progress' : data.status,
          solution: data.solution || null,
          durationMs: data.duration_ms ?? null,
          isNewBest: false,
        });
      }
      await refreshProfile();
      const seenHelp = typeof window !== 'undefined' && localStorage.getItem(SEEN_HELP_KEY) === 'true';
      await waitForMinLoader();
      setPhase(seenHelp ? 'ready' : 'onboarding_help');
    } catch (err) {
      console.error('Failed to load today’s round:', err);
      setAuthBlockedReason('unknown');
      setPhase('auth_blocked');
    }
  }, [refreshProfile, waitForMinLoader]);

  const bootAuth = useCallback(async () => {
    setPhase('auth_checking');
    try {
      const session = await ensureSession();
      if (!session.ok) {
        setAuthBlockedReason(session.reason || 'unknown');
        setPhase('auth_blocked');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const anon = userData.user?.is_anonymous ?? true;
      setUserId(uid);
      setIsAnonymous(anon);

      if (uid) {
        const { data: profileRow } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle();
        if (profileRow?.display_name) setDisplayName(profileRow.display_name);
      }

      const choiceDone = typeof window !== 'undefined' && sessionStorage.getItem(PLAY_CHOICE_KEY) === 'true';
      if (!anon || choiceDone) {
        await loadGameData();
      } else {
        await waitForMinLoader();
        setPhase('choice');
      }
    } catch (err) {
      console.error('Failed to establish session:', err);
      setAuthBlockedReason('unknown');
      setPhase('auth_blocked');
    }
  }, [loadGameData, waitForMinLoader]);

  useEffect(() => {
    bootAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthResolved = useCallback(
    (opts: { isAnonymous: boolean; displayName?: string; countryCode?: string | null }) => {
      if (typeof window !== 'undefined') sessionStorage.setItem(PLAY_CHOICE_KEY, 'true');
      setIsAnonymous(opts.isAnonymous);
      if (opts.displayName) setDisplayName(opts.displayName);
      loadGameData();
    },
    [loadGameData]
  );

  const handleOnboardingHelpClose = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.setItem(SEEN_HELP_KEY, 'true');
    setPhase('ready');
  }, []);

  const claimPractice = useCallback(async () => {
    setPracticeStatus('checking');
    try {
      const { data, error } = await supabase.rpc('wordlock_claim_practice', { p_date: todayUtc() });
      if (error) throw error;
      if (data?.allowed) {
        setPracticeWord(randomAnswer());
        setPracticeRound(emptyRoundState());
        setPracticeStatus('allowed');
      } else {
        setPracticeStatus('locked');
      }
    } catch (err) {
      console.error('Failed to check practice availability:', err);
      setPracticeStatus('error');
    }
  }, []);

  // Practice is limited to one round/day, enforced server-side; claim it the
  // first time the player switches into the tab each session.
  useEffect(() => {
    if (phase === 'ready' && mode === 'practice' && practiceStatus === 'unknown') {
      claimPractice();
    }
  }, [phase, mode, practiceStatus, claimPractice]);

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
        durationMs: data.duration_ms ?? null,
        isNewBest: data.is_new_best ?? false,
      };
    },
    [refreshProfile]
  );

  const resolvePracticeGuess = useCallback(
    async (guess: string): Promise<SubmitResult> => {
      const word = practiceWord || randomAnswer();
      const feedback = computeFeedback(guess, word);
      const won = guess === word;
      const nextAttempt = practiceRound.guesses.length + 1;
      const status = won ? 'won' : nextAttempt >= 6 ? 'lost' : 'in_progress';
      return { feedback, status, solution: status !== 'in_progress' ? word : null };
    },
    [practiceWord, practiceRound.guesses.length]
  );

  const dailyGame = useWordleGame(dailyRound, setDailyRound, resolveDailyGuess);
  const practiceGame = useWordleGame(practiceRound, setPracticeRound, resolvePracticeGuess);

  const active = mode === 'daily' ? dailyGame : practiceGame;
  const activeRound = mode === 'daily' ? dailyRound : practiceRound;
  const practiceLocked = mode === 'practice' && (practiceStatus === 'locked' || practiceStatus === 'checking' || practiceStatus === 'error');

  // Physical keyboard support
  useEffect(() => {
    if (phase !== 'ready' || showHelp || showStats || showLeaderboard || practiceLocked) return;
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
  }, [active, phase, showHelp, showStats, showLeaderboard, practiceLocked]);

  const achievements = useMemo(() => (profile ? computeAchievements(profile) : []), [profile]);
  const earnedCount = achievements.filter((a) => a.earned).length;

  const shareText = useMemo(() => {
    if (mode !== 'daily' || dailyRound.status === 'in_progress') return null;
    return buildShareText({
      title: `Wordezy ${challengeDate.current}`,
      feedback: dailyRound.feedback,
      attempt: dailyRound.status === 'won' ? dailyRound.guesses.length : null,
      url: 'https://wordezy.bgameworld.com',
    });
  }, [mode, dailyRound]);

  if (phase === 'auth_checking' || phase === 'loading_data') {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-5">
        <WordmarkTiles word="WORDEZY" size="lg" animate />
        <div className="w-5 h-5 border-2 border-rule border-t-correct rounded-full animate-spin" />
        <p className="font-mono text-[11px] tracking-wide text-muted">
          {phase === 'auth_checking' ? 'Signing you in…' : "Loading today's puzzle…"}
        </p>
      </div>
    );
  }

  if (phase === 'auth_blocked') {
    return (
      <div className="min-h-screen bg-ink text-paper flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-danger-soft border border-danger/40 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-danger" />
        </div>
        <h1 className="font-display font-semibold text-lg">Wordezy is briefly unavailable</h1>
        <p className="text-sm text-muted max-w-xs">
          {authBlockedReason === 'anonymous_disabled'
            ? "We're setting up today's game — please check back in a few minutes."
            : "We couldn't connect to the game right now. Check your connection and try again."}
        </p>
        <button
          type="button"
          onClick={bootAuth}
          className="mt-2 inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-surface-high hover:bg-rule border border-rule text-sm font-medium cursor-pointer transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  if (phase === 'choice') {
    return <AuthModal userId={userId} currentDisplayName={displayName} onResolved={handleAuthResolved} />;
  }

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-rule px-4 py-3 flex items-center justify-between max-w-[420px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <WordmarkTiles />
          <span className="font-display font-semibold text-base tracking-wide text-paper">Wordezy</span>
        </div>
        <div className="flex items-center gap-1">
          {mode === 'daily' && (
            <span
              className="flex items-center gap-1 text-[11px] font-mono font-medium text-correct bg-correct-soft border border-correct-dim/50 px-2 py-1 rounded"
              title="Current streak"
            >
              <Flame className="w-3 h-3" />
              {profile?.current_streak ?? 0}
            </span>
          )}
          {profile && (
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="flex items-center gap-1 text-[11px] font-mono font-medium text-present bg-present-soft border border-present-dim/50 px-2 py-1 rounded mr-1 cursor-pointer hover:border-present transition-colors"
              title="Achievements earned"
              aria-label={`${earnedCount} of ${ACHIEVEMENTS.length} achievements earned`}
            >
              <Trophy className="w-3 h-3" />
              {earnedCount}/{ACHIEVEMENTS.length}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="p-2 rounded-full hover:bg-surface text-muted hover:text-paper cursor-pointer transition-colors"
            aria-label="Speed leaderboard"
          >
            <Trophy className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-full hover:bg-surface text-muted hover:text-paper cursor-pointer transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="p-2 rounded-full hover:bg-surface text-muted hover:text-paper cursor-pointer transition-colors"
            aria-label="Statistics"
          >
            <BarChart3 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="flex justify-center py-4 px-4">
        <div className="relative flex items-center bg-surface border border-rule rounded-full p-1 w-full max-w-[260px]">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-surface-high border border-rule transition-transform duration-200 ease-out ${
              mode === 'daily' ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
            }`}
          />
          <button
            type="button"
            onClick={() => setMode('daily')}
            className={`relative z-10 flex-1 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              mode === 'daily' ? 'text-correct' : 'text-muted'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setMode('practice')}
            className={`relative z-10 flex-1 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              mode === 'practice' ? 'text-present' : 'text-muted'
            }`}
          >
            Practice
          </button>
        </div>
      </div>

      {/* Board */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-6">
        {practiceLocked ? (
          <div className="w-full max-w-[320px] sm:max-w-[360px] mx-auto text-center space-y-4 rounded-lg border border-rule bg-surface/60 px-5 py-8">
            {practiceStatus === 'checking' ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-rule border-t-present rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-present-soft border border-present-dim/50 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5 text-present" />
                </div>
                {practiceStatus === 'error' ? (
                  <>
                    <p className="text-sm text-paper">Couldn't check today's practice availability.</p>
                    <button
                      type="button"
                      onClick={claimPractice}
                      className="py-2 px-4 rounded-md bg-surface-high hover:bg-rule border border-rule text-sm font-medium cursor-pointer transition-colors"
                    >
                      Try again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-paper">You've used today's practice round.</p>
                    <p className="text-xs text-muted">Ready for the real thing?</p>
                    <button
                      type="button"
                      onClick={() => setMode('daily')}
                      className="py-2 px-5 rounded-md bg-correct hover:bg-correct-dim text-paper font-medium text-sm cursor-pointer transition-colors"
                    >
                      Play Daily Challenge
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <Board
              guesses={activeRound.guesses}
              feedback={activeRound.feedback}
              currentGuess={active.currentGuess}
              shakeRow={active.shakeRow}
              justSubmittedRow={active.justSubmittedRow}
            />

            {activeRound.status !== 'in_progress' && (
              <div
                className={`w-full max-w-[320px] sm:max-w-[360px] mx-auto text-center space-y-3 rounded-lg border px-5 py-4 animate-tile-pop ${
                  activeRound.status === 'won' ? 'bg-correct-soft border-correct-dim/50' : 'bg-danger-soft border-danger/40'
                }`}
              >
                <p className={`font-display font-semibold text-lg ${activeRound.status === 'won' ? 'text-correct' : 'text-danger'}`}>
                  {activeRound.status === 'won'
                    ? ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][activeRound.guesses.length - 1] || 'Solved!'
                    : `The word was ${activeRound.solution?.toUpperCase()}`}
                </p>
                {activeRound.status === 'won' && (
                  <>
                    <p className="text-xs text-muted">
                      Solved in {activeRound.guesses.length} / {active.maxGuesses}
                      {mode === 'daily' && activeRound.durationMs != null && (
                        <span className="text-present font-mono font-medium"> · {formatDuration(activeRound.durationMs)}</span>
                      )}
                    </p>
                    {mode === 'daily' && activeRound.isNewBest && (
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-present bg-present-soft border border-present-dim/50 rounded-full px-2.5 py-1">
                        <Flame className="w-3.5 h-3.5" />
                        New fastest solve!
                      </p>
                    )}
                  </>
                )}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {mode === 'practice' ? (
                    <>
                      <p className="text-xs text-muted">Come back tomorrow for another practice round.</p>
                      <button
                        type="button"
                        onClick={() => setMode('daily')}
                        className="py-2 px-5 rounded-md bg-correct hover:bg-correct-dim text-paper font-medium text-sm cursor-pointer transition-colors"
                      >
                        Play Daily
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => (activeRound.status === 'won' ? setShowLeaderboard(true) : setShowStats(true))}
                        className="py-2 px-5 rounded-md bg-correct hover:bg-correct-dim text-paper font-medium text-sm cursor-pointer transition-colors"
                      >
                        {activeRound.status === 'won' ? 'View leaderboard' : 'View stats'}
                      </button>
                      <p className="text-xs text-muted">Next word at midnight UTC</p>
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
          </>
        )}
      </main>

      <Toast message={active.toast} variant={active.toastVariant} />
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && (
        <StatsModal
          stats={profile}
          achievements={achievements}
          onClose={() => setShowStats(false)}
          shareText={shareText}
          showCountdown={mode === 'daily'}
        />
      )}
      {showLeaderboard && <LeaderboardModal userId={userId} onClose={() => setShowLeaderboard(false)} />}
      {phase === 'onboarding_help' && <HelpModal onClose={handleOnboardingHelpClose} />}
    </div>
  );
};
