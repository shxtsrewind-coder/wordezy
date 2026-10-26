/**
 * Rewarded video ads via AppLixir (https://applixir.com) — a separate ad
 * network from Google AdSense, used only for the opt-in "watch an ad for a
 * bonus practice round" reward, never for the banner/display ad on the
 * portal site.
 *
 * Gated entirely on an API key: until VITE_APPLIXIR_API_KEY is set to a real
 * key, REWARDED_ADS_ENABLED is false and every caller sees no button and no
 * network request — nothing here loads or runs. That's deliberate: this
 * ships disabled while the AdSense review for bgameworld.com is still
 * pending, so it can't affect what a reviewer sees. Flip it on later by
 * setting the real key in the Cloudflare Workers Build environment variables
 * (and locally in .env for testing) — no code change needed.
 */

const APPLIXIR_API_KEY = (import.meta.env.VITE_APPLIXIR_API_KEY as string) || '';
export const REWARDED_ADS_ENABLED = Boolean(APPLIXIR_API_KEY);

const SDK_URL = 'https://cdn.applixir.com/applixir.app.v6.1.0.js';
const CONTAINER_ID = 'applixir-ad-container';

declare global {
  interface Window {
    initializeAndOpenPlayer?: (options: Record<string, unknown>) => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.initializeAndOpenPlayer) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the ad SDK.'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

function ensureContainer(): void {
  if (document.getElementById(CONTAINER_ID)) return;
  const div = document.createElement('div');
  div.id = CONTAINER_ID;
  document.body.appendChild(div);
}

export interface RewardedAdHandlers {
  /** Called once the ad has been watched through — grant the reward here, and only here. */
  onReward: () => void;
  /** Called if the ad fails to load or play, or is skipped/closed early — no reward. */
  onFailure: (reason: string) => void;
}

/**
 * Loads (if needed) and shows a rewarded video ad. Does nothing if rewarded
 * ads aren't enabled — callers should check REWARDED_ADS_ENABLED before
 * showing any "watch an ad" button in the first place.
 */
export async function showRewardedAd(userId: string, { onReward, onFailure }: RewardedAdHandlers): Promise<void> {
  if (!REWARDED_ADS_ENABLED) {
    onFailure('Rewarded ads are not enabled.');
    return;
  }
  try {
    await loadSdk();
    ensureContainer();
    if (!window.initializeAndOpenPlayer) {
      onFailure('Ad SDK did not load correctly.');
      return;
    }
    window.initializeAndOpenPlayer({
      apiKey: APPLIXIR_API_KEY,
      injectionElementId: CONTAINER_ID,
      userId,
      adStatusCallbackFn: (status: { type: string }) => {
        if (status.type === 'complete') onReward();
        else if (status.type === 'skipped' || status.type === 'manuallyEnded') onFailure('Ad was closed before finishing.');
      },
      adErrorCallbackFn: (err: { getError: () => { data: { errorMessage?: string } } }) => {
        const message = err?.getError?.()?.data?.errorMessage || 'Ad failed to play.';
        onFailure(message);
      },
    });
  } catch (err) {
    onFailure((err as Error).message || 'Could not start the ad.');
  }
}
