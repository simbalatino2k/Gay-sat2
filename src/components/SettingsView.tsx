import React, { useState, useEffect } from 'react';
import { UserAccount, UserConsents, ModerationNotice, DsaAppealRecord } from '../types';
import {
  Shield,
  Lock,
  Bell,
  Trash2,
  CreditCard,
  LogOut,
  Flame,
  Check,
  Sparkles,
  Eye,
  ShieldCheck,
  Download,
  Edit3,
  AlertTriangle,
  Scale,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  RefreshCw,
  MapPin,
  CheckCircle,
  Zap,
  Crown,
  ArrowLeft,
  Globe
} from 'lucide-react';
import { useTranslation, CollapsedLanguageSelector } from '../context/LanguageContext';
import { AdSlot } from './ads';
import { getAdConsent, saveAdConsent } from '../config/adsConfig';
import { PremiumPaywallModal } from './billing/PremiumPaywallModal';
import { billingClient } from '../services/billingClient';

interface SettingsViewProps {
  currentUser: UserAccount;
  authToken: string;
  onLogout: () => void;
  onSelectTab?: (tab: any) => void;
  onUpdateUser?: (updated: UserAccount) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  authToken,
  onLogout,
  onSelectTab,
  onUpdateUser
}) => {
  const { language, setLanguage, t, languages } = useTranslation();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adConsent, setAdConsent] = useState(() => getAdConsent());
  const [locationPrivacy, setLocationPrivacy] = useState<'EXACT' | 'APPROXIMATE' | 'HIDDEN'>('APPROXIMATE');

  const handleUpdateAdConsent = (personalized: boolean) => {
    const updated = saveAdConsent({ allowPersonalizedAds: personalized });
    setAdConsent(updated);
    setConsentSuccessMsg('Ad privacy preference updated.');
    setTimeout(() => setConsentSuccessMsg(''), 3000);
  };

  // Push notifications state
  const [pushNotifs, setPushNotifs] = useState(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  // GDPR Consents State
  const [consents, setConsents] = useState<UserConsents | null>(null);
  const [savingConsents, setSavingConsents] = useState(false);
  const [consentSuccessMsg, setConsentSuccessMsg] = useState('');

  // GDPR Data Export
  const [exporting, setExporting] = useState(false);

  // GDPR Rectify Modal / Form
  const [showRectify, setShowRectify] = useState(false);
  const [rectifyEmail, setRectifyEmail] = useState(currentUser.email);
  const [rectifyDisplayName, setRectifyDisplayName] = useState(currentUser.profile.displayName);
  const [rectifyBio, setRectifyBio] = useState(currentUser.profile.bio || '');
  const [rectifying, setRectifying] = useState(false);
  const [rectifyMsg, setRectifyMsg] = useState('');

  // GDPR Objection
  const [objecting, setObjecting] = useState(false);
  const [objectMsg, setObjectMsg] = useState('');

  // DSA Notices & Appeals
  const [showDsaHub, setShowDsaHub] = useState(false);
  const [dsaNotices, setDsaNotices] = useState<ModerationNotice[]>([]);
  const [selectedNoticeForAppeal, setSelectedNoticeForAppeal] = useState<ModerationNotice | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealStatusMsg, setAppealStatusMsg] = useState('');

  // Transparency report stats
  const [showTransparency, setShowTransparency] = useState(false);
  const [transparencyData, setTransparencyData] = useState<any>(null);

  // Load consents on mount
  useEffect(() => {
    const fetchConsents = async () => {
      try {
        const res = await fetch('/api/gdpr/consents', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.consents) setConsents(data.consents);
        }
      } catch (err) {
        console.error('Failed to load GDPR consents:', err);
      }
    };

    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/dsa/notices', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.notices) setDsaNotices(data.notices);
        }
      } catch (err) {
        console.error('Failed to load DSA notices:', err);
      }
    };

    fetchConsents();
    fetchNotices();
  }, [authToken]);

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
      setPushNotifs(false);
    }
  };

  const handleCheckout = async () => {
    setShowPaywall(true);
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    setRestoreFeedback(null);
    try {
      const res = await billingClient.restorePurchases();
      setRestoreFeedback(res.message || (res.success ? 'Purchases restored!' : 'No active subscriptions found.'));
      if (res.success && res.entitlement) {
        if (onUpdateUser) {
          onUpdateUser({
            ...currentUser,
            isPremium: res.entitlement.premium,
            profile: {
              ...currentUser.profile,
              isPremium: res.entitlement.premium
            }
          });
        }
      }
    } catch (err: any) {
      setRestoreFeedback(err.message || 'Restoration failed.');
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleSaveConsent = async (key: keyof UserConsents, value: boolean) => {
    if (!consents || savingConsents) return;
    const previous = consents;
    const updated = { ...consents, [key]: value };
    setConsents(updated);
    setSavingConsents(true);
    try {
      const res = await fetch('/api/gdpr/consents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error('Privacy preferences could not be saved.');
      const data = await res.json();
      if (data.consents) setConsents(data.consents);
      setConsentSuccessMsg('Privacy preference saved.');
      setTimeout(() => setConsentSuccessMsg(''), 3000);
    } catch (err) {
      setConsents(previous);
      setConsentSuccessMsg('Nie zapisano zmiany. Spróbuj ponownie.');
      console.error('Consent save error:', err);
    } finally {
      setSavingConsents(false);
    }
  };

  const handleDownloadGdprData = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/gdpr/export', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-gdpr-data-${currentUser.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download export failed:', err);
      alert('Unable to export data package. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleRectifyData = async (e: React.FormEvent) => {
    e.preventDefault();
    setRectifying(true);
    setRectifyMsg('');
    try {
      const res = await fetch('/api/gdpr/rectify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: rectifyEmail,
          displayName: rectifyDisplayName,
          bio: rectifyBio
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRectifyMsg('Data rectified successfully under GDPR Article 16.');
        setTimeout(() => setShowRectify(false), 2000);
      } else {
        setRectifyMsg(data.error || 'Failed to rectify data');
      }
    } catch (err: any) {
      setRectifyMsg(err.message || 'Error rectifying data');
    } finally {
      setRectifying(false);
    }
  };

  const handleRecordObjection = async () => {
    setObjecting(true);
    try {
      const res = await fetch('/api/gdpr/object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          reason: 'Opt-out of automated profiling and AI suggestions under GDPR Article 21.'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setObjectMsg(data.message || 'Objection registered. AI & analytics disabled.');
        if (consents) {
          setConsents({ ...consents, aiAssistanceConsent: false, analyticsCookies: false });
        }
      }
    } catch (err) {
      console.error('Objection error:', err);
    } finally {
      setObjecting(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!selectedNoticeForAppeal || !appealReason.trim()) return;
    setSubmittingAppeal(true);
    try {
      const res = await fetch('/api/dsa/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          noticeId: selectedNoticeForAppeal.id,
          appealReason: appealReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAppealStatusMsg('Appeal officially recorded under DSA Art. 20. A human reviewer will process it.');
        setSelectedNoticeForAppeal(null);
        setAppealReason('');
      } else {
        alert(data.error || 'Failed to submit appeal');
      }
    } catch (err) {
      console.error('Appeal error:', err);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleFetchTransparency = async () => {
    setShowTransparency(!showTransparency);
    if (!transparencyData) {
      try {
        const res = await fetch('/api/dsa/transparency');
        const data = await res.json();
        setTransparencyData(data);
      } catch (err) {
        console.error('Failed to load transparency report:', err);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch('/api/gdpr/erase', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      onLogout();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-28 pt-1 px-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 transition active:scale-95 flex items-center justify-center"
              title="Wróć do Profilu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>{t('settings_title', 'Settings & Privacy Center')}</span>
          </h2>
        </div>
        <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-1 rounded-full border border-fuchsia-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
          <Sparkles className="w-3 h-3 text-fuchsia-400" /> GDPR & DSA
        </span>
      </div>

      {/* Language Selector (Small, Collapsed by Default) */}
      <div className="aura-glass-card rounded-[24px] border border-cyan-500/30 bg-[#0d101e]/80 p-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">{t('settings_language', 'Język aplikacji')}</span>
        </div>
        <CollapsedLanguageSelector />
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
              <h3 className="text-xs font-black text-white tracking-wide">AURA VIP PASS</h3>
              <p className="text-[10px] text-fuchsia-300/80">Konto Premium</p>
            </div>
          </div>
          <span className="text-[9px] font-black tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
            PREMIUM
          </span>
        </div>

        {/* Current VIP Status */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-300">
            Status: {currentUser.isPremium ? <strong className="text-emerald-400">VIP Aktywny</strong> : <span className="text-slate-400">Podstawowy</span>}
          </span>
          {currentUser.isPremium && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Aktywny
            </span>
          )}
        </div>

        {restoreFeedback && (
          <div className="p-2.5 rounded-xl bg-violet-950/50 border border-violet-500/30 text-[11px] text-violet-200">
            {restoreFeedback}
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button
            id="btn-open-paywall-modal"
            onClick={() => setShowPaywall(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-500 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-fuchsia-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            <span>Wybierz Premium</span>
          </button>

          <div className="flex items-center justify-between px-1 text-xs">
            <button
              id="btn-settings-restore-purchases"
              disabled={restoringPurchases}
              onClick={handleRestorePurchases}
              className="text-violet-400 hover:text-violet-300 transition flex items-center gap-1.5 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${restoringPurchases ? 'animate-spin' : ''}`} />
              <span>{restoringPurchases ? 'Sprawdzanie...' : 'Przywróć zakupy'}</span>
            </button>

            <button
              id="btn-settings-manage-subscription"
              onClick={() => billingClient.openSubscriptionManagement()}
              className="text-slate-400 hover:text-slate-200 transition font-medium"
            >
              Zarządzaj subskrypcją
            </button>
          </div>
        </div>
      </div>

      {/* Zasady UE (Dokładnie 3 konkretne zdania) */}
      <div className="aura-glass-card rounded-[24px] border border-blue-500/30 bg-[#0c1222]/85 p-4 space-y-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Zasady UE</h3>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-normal">
          AI podpowiada treści, nie podejmuje automatycznie decyzji moderacyjnych. Zgłoszenia i odwołania są dostępne zgodnie z DSA. Dane i zgody można zmienić lub pobrać.
        </p>
      </div>

      {/* GDPR Data Subject Rights (Articles 15, 16, 17, 18, 20, 21) */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/80 backdrop-blur-xl p-4 space-y-3.5 shadow-lg">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Data Subject Rights (EU GDPR)</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Export / Data Portability (Art. 15 & 20) */}
          <button
            onClick={handleDownloadGdprData}
            disabled={exporting}
            className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-left space-y-1 transition active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-cyan-400">
              <Download className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase">Art. 15/20</span>
            </div>
            <p className="text-xs font-bold text-white">{exporting ? 'Exporting...' : 'Export My Data'}</p>
            <p className="text-[10px] text-slate-400">Download signed JSON archive</p>
          </button>

          {/* Rectify (Art. 16) */}
          <button
            onClick={() => setShowRectify(!showRectify)}
            className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-left space-y-1 transition active:scale-[0.98]"
          >
            <div className="flex items-center justify-between text-purple-400">
              <Edit3 className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase">Art. 16</span>
            </div>
            <p className="text-xs font-bold text-white">Rectify Data</p>
            <p className="text-[10px] text-slate-400">Correct details or identity bio</p>
          </button>
        </div>

        {/* Rectification Modal / Inline Form */}
        {showRectify && (
          <form onSubmit={handleRectifyData} className="p-3.5 rounded-2xl bg-white/[0.04] border border-purple-500/30 space-y-2.5 animate-in fade-in">
            <div className="text-xs font-bold text-purple-300">Rectification Request</div>
            <div>
              <label className="text-[10px] text-slate-400">Email Address</label>
              <input
                type="email"
                value={rectifyEmail}
                onChange={e => setRectifyEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Display Name</label>
              <input
                type="text"
                value={rectifyDisplayName}
                onChange={e => setRectifyDisplayName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">About Me / Bio</label>
              <textarea
                value={rectifyBio}
                onChange={e => setRectifyBio(e.target.value)}
                rows={2}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            {rectifyMsg && <p className="text-[11px] text-emerald-400">{rectifyMsg}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRectify(false)}
                className="flex-1 py-1.5 rounded-xl bg-white/10 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rectifying}
                className="flex-1 py-1.5 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-500"
              >
                {rectifying ? 'Saving...' : 'Submit Rectification'}
              </button>
            </div>
          </form>
        )}

        {/* Right to Object (Art. 21) */}
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
          <div className="pr-2">
            <p className="text-xs font-bold text-white">Right to Object (Art. 21)</p>
            <p className="text-[10px] text-slate-400">Opt-out of automated profiling and AI suggestions</p>
          </div>
          <button
            onClick={handleRecordObjection}
            disabled={objecting}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 shrink-0"
          >
            {objecting ? 'Submitting...' : 'Object'}
          </button>
        </div>
        {objectMsg && <p className="text-[11px] text-cyan-400 px-1">{objectMsg}</p>}
      </div>

      {/* Location Privacy & Stealth Modes */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/80 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Location & Radar Privacy</h3>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
          {[
            { id: 'APPROXIMATE', label: 'Approximate', desc: 'Fuzzed to ~1km' },
            { id: 'EXACT', label: 'Exact', desc: 'Precise meters' },
            { id: 'HIDDEN', label: 'Stealth', desc: 'Invisible radar' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setLocationPrivacy(mode.id as any)}
              className={`p-2 rounded-2xl border transition-all ${
                locationPrivacy === mode.id
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold'
                  : 'border-white/[0.06] bg-white/[0.02] text-slate-400'
              }`}
            >
              <div className="text-xs">{mode.label}</div>
              <div className="text-[9px] opacity-75">{mode.desc}</div>
            </button>
          ))}
        </div>

        {/* Message Notifications */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] mt-2">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white">Desktop Push Notifications</p>
              <p className="text-[10px] text-slate-400">Immediate alerts for new matches and messages</p>
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

      {/* DSA Legal & Transparency Hub (EU Digital Services Act) */}
      <div className="aura-glass-card rounded-[28px] border border-amber-500/20 bg-[#0d0f1b]/80 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">EU Digital Services Act (DSA)</h3>
          </div>
          <button
            onClick={() => setShowDsaHub(!showDsaHub)}
            className="text-xs text-amber-300 hover:underline flex items-center gap-1"
          >
            {showDsaHub ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Transparent moderation, statement of reasons (Art. 17), and internal appeal system (Art. 20).
        </p>

        {showDsaHub && (
          <div className="space-y-3 pt-2 animate-in fade-in">
            {/* Transparency Report button */}
            <button
              onClick={handleFetchTransparency}
              className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 font-bold flex items-center justify-between"
            >
              <span>DSA Article 15 Transparency Report</span>
              <Info className="w-3.5 h-3.5" />
            </button>

            {showTransparency && transparencyData && (
              <div className="p-3 rounded-2xl bg-black/60 border border-white/10 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-bold text-amber-300">AURA EU DSA Transparency (Period: {transparencyData.reportingPeriod})</div>
                <div>Active EU Monthly Recipients: <strong className="text-white">{transparencyData.activeRecipientsOfServiceEU}</strong></div>
                <div>Reports Received: <strong className="text-white">{transparencyData.totalReportsReceived}</strong></div>
                <div>Human Review Ratio: <strong className="text-emerald-400">{transparencyData.humanReviewRatio}</strong></div>
                <div>Average Response Time: <strong className="text-white">{transparencyData.averageResolutionTimeHours} hours</strong></div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
                  EU Representative: {transparencyData.singlePointOfContactDSA?.euRepresentative}
                </div>
              </div>
            )}

            {/* Moderation Notices / Statement of Reasons (Art. 17) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white">Your Moderation Notices ({dsaNotices.length})</div>
              {dsaNotices.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 text-center">
                  Your account is in good standing with zero moderation penalties.
                </div>
              ) : (
                dsaNotices.map(notice => (
                  <div key={notice.id} className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-amber-300 font-bold">
                      <span>Action: {notice.decision}</span>
                      <span className="text-[10px] text-slate-400">{new Date(notice.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-200"><strong>Legal Basis:</strong> {notice.legalBasis}</p>
                    <p className="text-[11px] text-slate-300"><strong>Statement of Reasons:</strong> {notice.statementOfReasons}</p>

                    {/* Appeal Button (Art. 20) */}
                    <button
                      onClick={() => setSelectedNoticeForAppeal(notice)}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-[10px] font-bold text-white"
                    >
                      Submit DSA Article 20 Appeal
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Appeal Form Modal */}
            {selectedNoticeForAppeal && (
              <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 space-y-2">
                <div className="text-xs font-bold text-amber-200">Appeal Notice #{selectedNoticeForAppeal.id.slice(0, 8)}</div>
                <textarea
                  value={appealReason}
                  onChange={e => setAppealReason(e.target.value)}
                  placeholder="Explain why you believe this decision was made in error (minimum 10 characters)..."
                  rows={3}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedNoticeForAppeal(null)}
                    className="flex-1 py-1.5 rounded-xl bg-white/10 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitAppeal}
                    disabled={submittingAppeal || appealReason.trim().length < 10}
                    className="flex-1 py-1.5 rounded-xl bg-amber-600 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {submittingAppeal ? 'Submitting...' : 'Submit Official Appeal'}
                  </button>
                </div>
              </div>
            )}
            {appealStatusMsg && <p className="text-[11px] text-emerald-400 px-1">{appealStatusMsg}</p>}
          </div>
        )}
      </div>

      {/* Account Details */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">Account Credentials & Verification</h3>
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
        {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') && onSelectTab && (
          <button
            onClick={() => onSelectTab('admin')}
            className="w-full py-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-500/15 to-fuchsia-500/15 text-xs font-bold text-fuchsia-300 flex items-center justify-center gap-2 hover:bg-fuchsia-500/25 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(217,70,239,0.2)]"
          >
            <Shield className="w-4 h-4 text-fuchsia-400" />
            <span>Open Admin & DSA Moderation Dashboard</span>
          </button>
        )}

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
              Are you sure? Under GDPR Article 17, this permanently and irreversibly erases your profile, chats, photos, and sessions.
            </p>
            
            {/* Mandatory Store Subscription Notice */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-200/90 text-[11px] text-left leading-relaxed space-y-1.5">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Store Subscription Notice:
              </p>
              <p>
                Deleting your AURA account does <strong>NOT</strong> automatically cancel any active Google Play or Apple App Store subscriptions. Please cancel through your device store settings to prevent future renewal charges.
              </p>
              <button
                type="button"
                onClick={() => billingClient.openSubscriptionManagement()}
                className="text-violet-300 underline font-semibold text-[11px] block mt-1 hover:text-white"
              >
                Open Store Subscription Settings
              </button>
            </div>

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
                {deleting ? 'Erasing Data...' : 'Confirm Erasure'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Store-Compliant Premium Paywall Modal */}
      <PremiumPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={(entitlement) => {
          if (onUpdateUser) {
            onUpdateUser({
              ...currentUser,
              isPremium: entitlement.premium,
              profile: {
                ...currentUser.profile,
                isPremium: entitlement.premium
              }
            });
          }
        }}
      />
    </div>
  );
};
