import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

interface ChallengeTicket {
  date: string;
  game: string;
  token: string;
}

declare global {
  interface Window {
    /** Set by the inline script in index.html, before any module loads —
     *  see that file for why the hash has to be read and cleared that early. */
    __bgwChallenge?: ChallengeTicket;
  }
}

const ticket: ChallengeTicket | null = (typeof window !== 'undefined' && window.__bgwChallenge) || null;

/**
 * Reports this round's score to the bgameworld.com daily-challenge
 * leaderboard, if this visit came from a signed-in challenge link.
 * Best-effort and silent: nothing here ever affects the player's own game,
 * stats or streak, and a guest visit (no ticket) is a no-op.
 */
export async function reportChallengeScore(score: number): Promise<void> {
  if (!ticket) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_challenge_score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${ticket.token}`,
      },
      body: JSON.stringify({ p_date: ticket.date, p_game: ticket.game, p_score: score }),
    });
  } catch {
    // best-effort; a failed report shouldn't surface to the player
  }
}
