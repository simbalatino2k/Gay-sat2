import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Shield, Lock, Bell, Trash2, CreditCard, LogOut, Flame, Check, Sparkles, Eye, ShieldCheck, Moon } from 'lucide-react';

interface SettingsViewProps {
  currentUser: UserAccount;
  authToken: string;
  onLogout: () => void;
  onSelectTab?: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  authToken,
  onLogout
}) => {
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  const togglePushNotifs = async () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    
    if (!pushNotifs) {
      if (Notification.permission === 'granted') {
        setPushNotifs(true);
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushNotifs(true);
        } else {
          setPushNotifs(false);
        }
      } else {
        alert('Notifications are blocked. Please enable them in your browser settings.');
      }
    } else {
      // In a real app we'd save this preference to the backend or localStorage to mute them
      // For now we just visually toggle it off.
      setPushNotifs(false);
    }
  };

  const handleCheckout = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/payments/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ planId: 'aura-black-monthly' })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        setUpgradeUrl(data.checkoutUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpgrading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      onLogout();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 px-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-extrabold text-white tracking-wide">Settings & Account</h2>
        <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AURA Edition
        </span>
      </div>

      {/* Membership Plan Tier Card */}
      <div className="aura-glass-card rounded-[28px] border border-fuchsia-500/30 bg-gradient-to-br from-[#1b0d26]/80 via-[#140b1e]/70 to-[#0c0e18]/90 p-5 space-y-3.5 shadow-2xl shadow-purple-950/40 relative overflow-hidden backdrop-blur-2xl">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-fuchsia-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-500 shadow-md shadow-fuchsia-950/60">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white tracking-wide">AURA BLACK PASS</h3>
              <p className="text-[10px] text-fuchsia-300/80">Sensual & Privileged Experience</p>
            </div>
          </div>
          <span className="text-[9px] font-black tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
            PREMIUM
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Enjoy unlimited likes, see who viewed your profile, stealth incognito mode, and top priority in Discover.
        </p>

        {upgradeUrl ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center space-y-2">
            <p className="text-xs font-bold text-emerald-300">Stripe checkout session ready!</p>
            <a
              href={upgradeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:brightness-110 active:scale-95 transition"
            >
              Complete Subscription
            </a>
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={upgrading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-500 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-fuchsia-950/50 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
          >
            {upgrading ? 'Preparing subscription...' : 'Unlock for $9.99 / mo'}
          </button>
        )}
      </div>

      {/* Privacy & Experience Controls */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">Privacy & Notifications</h3>
        
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs font-bold text-white">Stealth Mode (Incognito)</p>
                <p className="text-[10px] text-slate-400">Hide your exact distance on Discover</p>
              </div>
            </div>
            <button
              onClick={() => setStealthMode(!stealthMode)}
              className={`w-10 h-5 rounded-full transition-colors relative ${stealthMode ? 'bg-fuchsia-600' : 'bg-white/20'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${stealthMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-bold text-white">Message Notifications</p>
                <p className="text-[10px] text-slate-400">Discreet alerts for matches and chats</p>
              </div>
            </div>
            <button
              onClick={togglePushNotifs}
              className={`w-10 h-5 rounded-full transition-colors relative ${pushNotifs ? 'bg-cyan-600' : 'bg-white/20'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${pushNotifs ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">Account Details</h3>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex justify-between py-1.5 border-b border-white/[0.05] px-1">
            <span className="text-slate-400">Email Address:</span>
            <span className="font-semibold text-white">{currentUser.email}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/[0.05] px-1">
            <span className="text-slate-400">Access Tier:</span>
            <span className="font-semibold text-fuchsia-400">{currentUser.role}</span>
          </div>
          <div className="flex justify-between py-1.5 px-1">
            <span className="text-slate-400">18+ Verification:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Adult Verified (18+)
            </span>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 hover:bg-white/[0.08] active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Sign Out</span>
        </button>

        <button
          onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
          className="w-full py-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] text-xs font-bold text-rose-400 flex items-center justify-center gap-2 hover:bg-rose-500/[0.14] active:scale-[0.98] transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account</span>
        </button>

        {showDeleteConfirm && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 space-y-3 text-center animate-in fade-in zoom-in-95 duration-200">
            <p className="text-xs text-rose-200 font-medium">
              Are you sure? This action will sign you out and safely deactivate your account.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs text-slate-300 hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
