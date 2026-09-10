import React, { useState } from 'react';
import { SexualRole, Tribe, LookingFor } from '../types';
import { Shield, ArrowRight, Check, Sparkles, Mail, Lock, User, MapPin, Camera, ChevronRight } from 'lucide-react';
import { AuraLogo } from './AuraLogo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithGoogle, 
  loginWithFirebaseEmail, 
  registerWithFirebaseEmail, 
  saveProfileToFirestore 
} from '../services/firebaseService';
import { auth } from '../lib/firebase';

interface OnboardingFlowProps {
  onComplete: (session: { token: string; user: any }) => void;
}

const ROLES: SexualRole[] = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'Unspecified'];
const TRIBES: Tribe[] = ['Bear', 'Otter', 'Cub', 'Jock', 'Twink', 'Geek', 'Daddy', 'Leather', 'Clean Cut', 'Muscle', 'Trans', 'Queer', 'Pup'];
const LOOKING_FOR: LookingFor[] = ['Dating', 'Hookups', 'Friends', 'Networking', 'Relationship', 'Right Now', 'Chat'];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'auth' | 'profile'>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile setup fields
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState(25);
  const [identityRole, setIdentityRole] = useState<SexualRole>('Versatile');
  const [location, setLocation] = useState('Los Angeles, CA');
  const [bio, setBio] = useState('');
  const [selectedTribes, setSelectedTribes] = useState<Tribe[]>(['Jock']);
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingFor[]>(['Dating', 'Friends']);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Recovery State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'submit'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset.');
      }
      if (data.devResetToken) {
        setResetToken(data.devResetToken);
      }
      setResetMsg({
        type: 'success',
        text: data.message || 'If an account exists with this email, recovery instructions have been sent.'
      });
      setResetStep('submit');
    } catch (err: any) {
      setResetMsg({ type: 'error', text: err.message || 'Error processing request.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword.trim()) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }
      setResetMsg({
        type: 'success',
        text: 'Your password has been updated! You may now log in.'
      });
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetStep('request');
        setResetMsg(null);
        setIsLogin(true);
      }, 2000);
    } catch (err: any) {
      setResetMsg({ type: 'error', text: err.message || 'Failed to reset password.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await signInWithGoogle();
      setSuccess(true);
      setTimeout(() => {
        onComplete(data);
      }, 500);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setError(err.message || 'Nie udało się zalogować przez Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let data;
      if (isLogin) {
        data = await loginWithFirebaseEmail(email, password);
      } else {
        data = await registerWithFirebaseEmail(email, password);
      }
      setSuccess(true);
      setTimeout(() => {
        if (data?.token) {
          localStorage.setItem('aura_auth_token', data.token);
          localStorage.setItem('aura_token', data.token);
        }
        if (isLogin) {
          onComplete(data);
        } else {
          setStep('profile');
          setSuccess(false);
        }
      }, 500);
    } catch (err: any) {
      // Fallback to local server auth if Firebase Auth fails or is disabled
      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const bodyPayload = isLogin
          ? { email, password }
          : {
              email,
              password,
              displayName: email.split('@')[0] || 'AURA Member',
              age: 18,
              is18PlusAccepted: true,
              isAgeVerified18Plus: true
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const fallbackData = await res.json();
        if (!res.ok) throw new Error(fallbackData.error || err.message || 'Nie udało się zalogować');

        setSuccess(true);
        setTimeout(() => {
          if (fallbackData?.token) {
            localStorage.setItem('aura_auth_token', fallbackData.token);
            localStorage.setItem('aura_token', fallbackData.token);
          }
          if (isLogin) {
            onComplete(fallbackData);
          } else {
            setStep('profile');
            setSuccess(false);
          }
        }, 500);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || err.message || 'Błąd logowania');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('aura_auth_token') || localStorage.getItem('aura_token');

    try {
      const profileUpdates = {
        displayName,
        age,
        identityRole,
        location,
        bio,
        tribes: selectedTribes,
        lookingFor: selectedLookingFor,
        photos: [{ id: `ph-${Date.now()}`, url: photoUrl, isPrimary: true }]
      };

      // Sync with Firestore if possible
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await saveProfileToFirestore(currentUser.uid, profileUpdates);
        }
      } catch (fsErr) {
        console.warn('Firestore profile save notice:', fsErr);
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileUpdates)
      });
      const data = await res.json();
      if (data.user) {
        setSuccess(true);
        setTimeout(() => {
          if (token) {
            localStorage.setItem('aura_auth_token', token);
            localStorage.setItem('aura_token', token);
          }
          onComplete({ token: token!, user: data.user });
        }, 500);
      } else {
        // If local API didn't return user, use fallback or navigate
        if (token) {
          localStorage.setItem('aura_auth_token', token);
          localStorage.setItem('aura_token', token);
        }
        onComplete({ token: token || 'aura_session', user: { id: auth.currentUser?.uid || 'user-new', profile: profileUpdates } });
      }
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060a]/95 backdrop-blur-2xl p-4 md:p-8 overflow-y-auto custom-scrollbar">
      {/* Background Animated Gradient Ambient Orbs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[130px] pointer-events-none animate-float-orb-1" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[32rem] h-[32rem] bg-fuchsia-600/15 rounded-full blur-[140px] pointer-events-none animate-float-orb-2" />

      {/* Main Container: Mobile Card / Desktop Split Showcase */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md md:max-w-4xl aura-glass-card rounded-[32px] p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7)] my-auto"
      >
        {/* Subtle Glass Reflection Line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Column (Brand Identity & Desktop Atmosphere) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-4 md:border-r md:border-white/10 md:pr-8">
            <AuraLogo size={140} showText={false} badge={true} />

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                  AURA
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
                  18+
                </span>
              </div>
              <p className="text-xs text-purple-300/90 font-semibold tracking-wider uppercase">
                Gay & Queer Adult Network
              </p>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs hidden sm:block">
              Connect with verified local profiles, explore live radar, and enjoy private encrypted chat.
            </p>

            <div className="hidden md:flex flex-col gap-2 pt-2 text-left w-full text-[11px] text-slate-300">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified 18+ Adult Community</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
                <span>Interactive Grid & Live Radar</span>
              </div>
            </div>
          </div>

          {/* Right Column (Auth / Profile Setup Form) */}
          <div className="md:col-span-7 space-y-5 text-left">
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium flex items-center justify-between"
              >
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
              </motion.div>
            )}

            {step === 'auth' ? (
              <div className="space-y-4">
                {showForgotPassword ? (
                  /* Password Recovery View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-fuchsia-400" />
                          <span>Password Recovery</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {resetStep === 'request' ? 'Request a secure recovery token' : 'Set your new password'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetMsg(null);
                        }}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    {resetMsg && (
                      <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                        resetMsg.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      }`}>
                        <span>{resetMsg.text}</span>
                      </div>
                    )}

                    {resetStep === 'request' ? (
                      <form onSubmit={handleRequestPasswordReset} className="space-y-3.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                            Account Email
                          </label>
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            placeholder="alex@domain.com"
                            className="w-full aura-glass-input rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={resetLoading || !resetEmail.trim()}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-bold text-white shadow-lg shadow-purple-950/50 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                        >
                          {resetLoading ? 'Sending...' : 'Send Recovery Token'}
                        </button>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => setResetStep('submit')}
                            className="text-[11px] text-fuchsia-300 hover:underline"
                          >
                            Already have a recovery token? Enter it here
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleExecutePasswordReset} className="space-y-3.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                            Recovery Token
                          </label>
                          <input
                            type="text"
                            required
                            value={resetToken}
                            onChange={e => setResetToken(e.target.value)}
                            placeholder="Paste your recovery token"
                            className="w-full aura-glass-input rounded-2xl px-4 py-3 text-xs text-white font-mono placeholder:text-slate-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                            New Password (min. 8 characters)
                          </label>
                          <input
                            type="password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full aura-glass-input rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={resetLoading || !resetToken.trim() || newPassword.length < 8}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-bold text-white shadow-lg shadow-purple-950/50 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                        >
                          {resetLoading ? 'Updating...' : 'Set New Password & Return to Login'}
                        </button>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => setResetStep('request')}
                            className="text-[11px] text-slate-400 hover:text-white transition-colors"
                          >
                            Need a new recovery token?
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Google Sign-In CTA */}
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/20 group"
                    >
                      <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z" />
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9c-.6-.7-1.1-1.7-1.1-2.9z" />
                        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                      </svg>
                      <span>Zaloguj się przez Google</span>
                    </button>

                    <div className="relative flex items-center justify-center my-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <span className="relative px-3 bg-[#090b12] text-[10px] uppercase tracking-wider text-slate-400 font-bold rounded-full border border-white/5">lub adresem email</span>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {/* Segmented Tab Switcher */}
                      <div className="relative flex rounded-2xl bg-black/40 p-1 border border-white/10">
                        <button
                          type="button"
                          onClick={() => { setIsLogin(true); setError(null); }}
                          className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors duration-200 ${
                            isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsLogin(false); setError(null); }}
                          className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors duration-200 ${
                            !isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Create Account
                        </button>

                        {/* Animated Active Pill Indicator */}
                        <motion.div
                          className="absolute inset-y-1 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-md shadow-fuchsia-500/30"
                          initial={false}
                          animate={{
                            left: isLogin ? '4px' : '50%',
                            width: 'calc(50% - 4px)'
                          }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      </div>

                      {/* Form Inputs */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>Email Address</span>
                            </span>
                            {email.length > 0 && email.includes('@') && !error && (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            )}
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={e => {
                              setEmail(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="alex@domain.com"
                            className={`w-full aura-glass-input rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition-all ${
                              error
                                ? 'animate-pulse-red border-rose-500/80 bg-rose-950/10'
                                : success
                                ? 'animate-pulse-green border-emerald-400/80 bg-emerald-950/10'
                                : email.length > 0 && email.includes('@')
                                ? 'border-emerald-500/50 focus:border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
                                : ''
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>Password</span>
                            </span>
                            {password.length >= 6 && !error && (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={e => {
                              setPassword(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="••••••••"
                            className={`w-full aura-glass-input rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition-all ${
                              error
                                ? 'animate-pulse-red border-rose-500/80 bg-rose-950/10'
                                : success
                                ? 'animate-pulse-green border-emerald-400/80 bg-emerald-950/10'
                                : password.length >= 6
                                ? 'border-emerald-500/50 focus:border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
                                : ''
                            }`}
                          />
                        </div>

                        {isLogin && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowForgotPassword(true);
                                setResetEmail(email);
                                setError(null);
                              }}
                              className="text-[11px] text-fuchsia-300/80 hover:text-white transition-colors underline-offset-2 hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Primary CTA Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 animate-breathe-glow overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer-pass" />
                        
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {success ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                              <span>Success! Redirecting...</span>
                            </>
                          ) : loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Authenticating...</span>
                            </>
                          ) : (
                            <>
                              <span>{isLogin ? 'Sign In to AURA' : 'Continue to Profile'}</span>
                              <ChevronRight className="w-4 h-4 text-cyan-200" />
                            </>
                          )}
                        </span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : (
              /* Profile Setup Step */
              <form onSubmit={handleProfileSubmit} className="space-y-3.5">
                <div className="border-b border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-fuchsia-400" />
                    <span>Create Your AURA Identity</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Set up your public queer profile details</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300">Display Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Christian"
                      className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300">Age (18+)</label>
                    <input
                      type="number"
                      min={18}
                      max={99}
                      required
                      value={age}
                      onChange={e => setAge(parseInt(e.target.value) || 18)}
                      className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300">Sexual Role / Position</label>
                    <select
                      value={identityRole}
                      onChange={e => setIdentityRole(e.target.value as SexualRole)}
                      className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300">Location</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Los Angeles, CA"
                      className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Primary Photo Image URL</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                    className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 animate-breathe-glow overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {success ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                        <span>Profile Complete!</span>
                      </>
                    ) : loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter AURA Network</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};

