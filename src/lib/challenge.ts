import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

interface ChallengeTicket {
  date: string;
  game: string;
  token: string;
}

let ticket: ChallengeTicket | null = null;

// The bgameworld.com portal's daily-challenge popup links here as
// https://wordezy.bgameworld.com/#ch=<date>|<game>|<access token> for a
// signed-in player. The fragment never reaches any server on its own (no
// Referer header, no access log), so this is the only place it's read. We
// pull it into memory once and strip it from the address bar immediately —
// it shouldn't linger visibly, and a refresh/share of the page shouldn't
// resubmit it.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#ch=')) {
  try {
    const raw = decodeURIComponent(window.location.hash.slice(4));
    const [date, game, token] = raw.split('|');
    if (date && game && token) ticket = { date, game, token };
  } catch {
    // malformed fragment; ignore and carry on as an ordinary visit
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

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
