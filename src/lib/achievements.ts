import type { ProfileStats } from '../components/StatsModal.tsx';

export interface Achievement {
  id: string;
  label: string;
  /** What it takes, shown on the badge once earned. */
  description: string;
  /** Emoji mark — keeps the badge grid lightweight, no extra icon imports. */
  mark: string;
  /** Current progress toward the goal, and the goal itself, for a locked badge's progress bar. */
  progress: (stats: ProfileStats) => { value: number; goal: number };
}

const soloOrDuoGuesses = (stats: ProfileStats) => (stats.guess_distribution[0] || 0) + (stats.guess_distribution[1] || 0);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    label: 'First Win',
    description: 'Solve your first daily word',
    mark: '🌱',
    progress: (s) => ({ value: s.games_won, goal: 1 }),
  },
  {
    id: 'hole_in_one',
    label: 'Hole in One',
    description: 'Solve a word on your very first guess',
    mark: '🎯',
    progress: (s) => ({ value: s.guess_distribution[0] || 0, goal: 1 }),
  },
  {
    id: 'sharp_eye',
    label: 'Sharp Eye',
    description: 'Solve in 1 or 2 guesses, five times',
    mark: '🔍',
    progress: (s) => ({ value: soloOrDuoGuesses(s), goal: 5 }),
  },
  {
    id: 'streak_3',
    label: 'Warming Up',
    description: 'Reach a 3-day streak',
    mark: '🔥',
    progress: (s) => ({ value: s.max_streak, goal: 3 }),
  },
  {
    id: 'streak_7',
    label: 'Week Streak',
    description: 'Reach a 7-day streak',
    mark: '⚡',
    progress: (s) => ({ value: s.max_streak, goal: 7 }),
  },
  {
    id: 'streak_14',
    label: 'Fortnight Streak',
    description: 'Reach a 14-day streak',
    mark: '🌟',
    progress: (s) => ({ value: s.max_streak, goal: 14 }),
  },
  {
    id: 'streak_30',
    label: 'Month Streak',
    description: 'Reach a 30-day streak',
    mark: '👑',
    progress: (s) => ({ value: s.max_streak, goal: 30 }),
  },
  {
    id: 'dedicated',
    label: 'Dedicated',
    description: 'Play 25 games',
    mark: '🧩',
    progress: (s) => ({ value: s.games_played, goal: 25 }),
  },
  {
    id: 'centurion',
    label: 'Centurion',
    description: 'Play 100 games',
    mark: '🏛️',
    progress: (s) => ({ value: s.games_played, goal: 100 }),
  },
  {
    id: 'flawless',
    label: 'Flawless',
    description: 'Win every game across 10+ played',
    mark: '💎',
    progress: (s) => ({
      value: s.games_played >= 10 && s.games_won === s.games_played ? 1 : 0,
      goal: 1,
    }),
  },
];

export interface AchievementState extends Achievement {
  earned: boolean;
  value: number;
  goal: number;
}

export function computeAchievements(stats: ProfileStats): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const { value, goal } = a.progress(stats);
    return { ...a, value: Math.min(value, goal), goal, earned: value >= goal };
  });
}
