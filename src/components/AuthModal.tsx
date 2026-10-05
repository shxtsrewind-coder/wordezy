import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, Trophy, Smartphone } from 'lucide-react';
import { supabase, parseSupabaseError } from '../lib/supabase.ts';
import { validateDisplayNameFormat, checkDisplayNameTaken } from '../lib/authHelpers.ts';
import { CountrySelect } from './CountrySelect.tsx';
import { getUserCountryCode, setUserCountry } from '../lib/countryFlags.ts';

type AuthModalMode = 'choice' | 'signup' | 'login';

interface AuthModalProps {
  userId: string | null;
  currentDisplayName: string;
  onResolved: (opts: { isAnonymous: boolean; displayName?: string; countryCode?: string | null }) => void;
}

/**
 * Mandatory first-run modal: play as a guest on this device, or create a free
 * account / log in to appear on the leaderboard and keep progress across
 * devices. By the time this renders, an anonymous session already exists
 * (GamePage establishes it before showing this modal), so "Continue as
 * Guest" is just a dismiss, and "Create a free account" upgrades that same
 * anonymous session in place via supabase.auth.updateUser (stats preserved).
 */
export const AuthModal: React.FC<AuthModalProps> = ({ userId, currentDisplayName, onResolved }) => {
  const [mode, setMode] = useState<AuthModalMode>('choice');
  const [displayName, setDisplayName] = useState(
    currentDisplayName && !currentDisplayName.startsWith('Player') ? currentDisplayName : ''
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => getUserCountryCode() || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatusMsg, setResendStatusMsg] = useState<string | null>(null);

  const handleGuest = () => {
    onResolved({ isAnonymous: true });
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResendStatusMsg(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const selectedCode = selectedCountryCode.trim() ? selectedCountryCode.trim().toUpperCase() : null;

    const nameFormat = validateDisplayNameFormat(trimmedName);
    if (!nameFormat.valid) {
      setErrorMsg(nameFormat.error || 'Display name must be between 2 and 20 characters');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Please choose a password (at least 6 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const takenCheck = await checkDisplayNameTaken(trimmedName, userId);
      if (takenCheck.taken) {
        setErrorMsg('That name is taken, try another');
        setIsSubmitting(false);
        return;
      }

      if (userId) {
        await supabase.from('profiles').upsert({ id: userId, display_name: trimmedName, country_code: selectedCode });
      }
      setUserCountry(selectedCode);

      const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail, password });
      if (authError) throw authError;

      setConfirmationPending(true);
    } catch (err: any) {
      console.error('Error creating account:', err);
      const msg = err.message || 'Failed to create account. Please try again.';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('email exists')) {
        setErrorMsg('An account with this email already exists. Try logging in instead.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter your email');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (signInError) throw signInError;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, country_code')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.country_code) setUserCountry(profile.country_code);
        onResolved({ isAnonymous: false, displayName: profile?.display_name || 'Player', countryCode: profile?.country_code });
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(await parseSupabaseError(err).catch(() => err.message || 'Invalid email or password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setResendingEmail(true);
    setResendStatusMsg(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'email_change', email: trimmedEmail });
      if (error) throw error;
      setResendStatusMsg('Confirmation email resent! Check your inbox.');
    } catch (err: any) {
      setResendStatusMsg(err.message || 'Could not resend email yet. Please check your spam folder.');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-[#141210] border border-emerald-700/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmationPending ? (
          <div className="space-y-5 py-3">
            <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Mail className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-emerald-200 leading-relaxed">
                Almost there! Check your email to confirm your account — your streak and stats are already saved and
                will stay with you.
              </p>
              <div className="pt-2 border-t border-emerald-900/50 text-xs text-stone-400 space-y-2.5">
                <p>
                  We sent a confirmation link to <span className="text-emerald-300 font-mono font-semibold">{email}</span>.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendingEmail}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 font-medium transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {resendingEmail && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Resend confirmation email</span>
                </button>
                {resendStatusMsg && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-900/80">
                    {resendStatusMsg}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onResolved({ isAnonymous: true, displayName: displayName.trim() || undefined })}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              Continue to Game
            </button>
          </div>
        ) : mode === 'choice' ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 pt-1">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-400">
                How do you want to play?
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                Choose how you'd like to experience Wordezy. You can create an account anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                onClick={handleGuest}
                className="group relative p-5 rounded-2xl bg-stone-900/90 hover:bg-stone-850 border-2 border-stone-700/80 hover:border-stone-500 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.99] shadow-lg"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 group-hover:text-stone-100 transition-colors">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 font-display">Continue as Guest</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Play right away. Your streak stays on this device and won't appear on the leaderboard.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-stone-300 group-hover:text-emerald-300 transition-colors">
                  <span>Play as Guest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('signup')}
                className="group relative p-5 rounded-2xl bg-[#121a15] hover:bg-[#162119] border-2 border-emerald-700/70 hover:border-emerald-500 transition-all text-left flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.99] shadow-lg shadow-emerald-950/20"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-300 font-display">Create a free account</h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Keep your streak forever and compete on the speed leaderboard.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  <span>Sign Up Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-stone-800 text-center">
              <p className="text-xs text-stone-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Log in to your account
                </button>
              </p>
            </div>
          </div>
        ) : mode === 'signup' ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to options</span>
              </button>
              <span className="text-[11px] font-mono text-emerald-400/90 font-semibold uppercase">Free Registration</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-400">
                Create a Free Account
              </h2>
              <p className="text-xs text-stone-400">Save your streak and join the speed leaderboard.</p>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-300 font-mono">
                    Display Name <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-stone-500">{displayName.length}/20 chars</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setErrorMsg(null);
                    }}
                    maxLength={20}
                    minLength={2}
                    required
                    placeholder="e.g. WordWizard"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <CountrySelect value={selectedCountryCode} onChange={(code) => setSelectedCountryCode(code)} />

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Email Address <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Choose a Password <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    minLength={6}
                    required
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 hover:from-emerald-500 hover:to-amber-400 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account &amp; Join Leaderboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs border-t border-stone-800">
              <p className="text-stone-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to options</span>
              </button>
              <span className="text-[11px] font-mono text-emerald-400/90 font-semibold uppercase">Member Sign In</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-400">
                Log In to Wordezy
              </h2>
              <p className="text-xs text-stone-400">Access your saved streak and leaderboard rank.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Email Address <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 font-mono">
                  Password <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    placeholder="Your password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-stone-100 text-sm focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 hover:from-emerald-500 hover:to-amber-400 active:scale-[0.98] text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs border-t border-stone-800">
              <p className="text-stone-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Create free account
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
