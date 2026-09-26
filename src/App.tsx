import React, { useState, useEffect } from 'react';
import { UserAccount, UserProfile, FilterState } from './types';
import { AgeGateModal } from './components/AgeGateModal';
import { Navigation, NavTab } from './components/Navigation';
import { DiscoverFeed } from './components/DiscoverFeed';
import { MatchesView } from './components/MatchesView';
import { ChatView } from './components/ChatView';
import { ProfileEditor } from './components/ProfileEditor';
import { ProfileModal } from './components/ProfileModal';
import { SettingsView } from './components/SettingsView';
import { AdminDashboard } from './components/AdminDashboard';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PWAInstallButton } from './components/PWAInstallButton';
import { MapView } from './components/MapView';
import { Shield, ShieldCheck, Sparkles, SlidersHorizontal, Compass, Heart, MessageSquare, User, Settings, Lock, Radio, MapPin, Flame } from 'lucide-react';
import { AuraLogo, AuraLogoIcon } from './components/AuraLogo';
import { motion, AnimatePresence } from 'motion/react';
import { onIdTokenChanged } from 'firebase/auth';
import { auraWebSocketUrl } from './lib/websocketEndpoint';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { formatUserAccount, logoutFirebase } from './services/firebaseService';
import { useBackgroundNotifications } from './hooks/useBackgroundNotifications';
import { PermissionsPromptModal } from './components/PermissionsPromptModal';
import { PermissionResults } from './services/permissionsService';
import { PERMISSIONS_PROMPTED_KEY, isPaymentReturnLocation, shouldOfferPermissionsPrompt } from './lib/permissionsPrompt';
import { useTranslation, LanguagePickerButton } from './context/LanguageContext';
import { VideoCallModal } from './components/VideoCallModal';
import { ProfileSetupRequiredModal } from './components/common/ProfileSetupRequiredModal';
import { CheckoutConfirmation } from './components/billing/CheckoutConfirmation';
import { BoostConfirmation } from './components/billing/BoostConfirmation';

export default function App() {
  const { t } = useTranslation();
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('aura_18plus_verified') === 'true';
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('aura_auth_token');
  });

  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);

  // Background Push Notifications (Desktop / Hidden Tab)
  useBackgroundNotifications(token);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('discover');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    minAge: 18,
    maxAge: 65,
    maxDistanceKm: 100,
    roles: [],
    lookingFor: [],
    tribes: [],
    onlineOnly: false,
    verifiedOnly: false,
    hasPhotosOnly: false
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeSkinId, setActiveSkinId] = useState<string>(() => {
    return localStorage.getItem('aura_active_skin') || 'cyberpunk-neon';
  });

  const handleSelectSkin = (skinId: string) => {
    localStorage.setItem('aura_active_skin', skinId);
    setActiveSkinId(skinId);
  };

  // Global WebRTC Calling (Incoming & Outgoing for whole app)
  const [activeCallSession, setActiveCallSession] = useState<{
    isOpen: boolean;
    isIncoming: boolean;
    targetUser: {
      id: string;
      displayName: string;
      photoUrl?: string;
      role?: string;
    };
    callType: 'video' | 'voice';
    incomingSignalData?: any;
  } | null>(null);

  const handleStartCall = (target: { id: string; displayName: string; photoUrl?: string; role?: string }, callType: 'video' | 'voice') => {
    setActiveCallSession({
      isOpen: true,
      isIncoming: false,
      targetUser: target,
      callType,
      incomingSignalData: null
    });
  };

  // Global WebRTC signaling listener so incoming calls are received anywhere in the app
  useEffect(() => {
    if (!token || !currentUser) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isCancelled = false;

    const connectGlobalSignal = () => {
      if (isCancelled) return;
      const wsUrl = auraWebSocketUrl(window.location);

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: 'AUTH', token }));
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === 'CALL_REQUEST') {
              // If already in an active call, immediately decline as BUSY
              if (activeCallSession?.isOpen) {
                ws?.send(JSON.stringify({
                  type: 'CALL_REJECTED',
                  targetUserId: data.senderId,
                  reason: 'BUSY'
                }));
                return;
              }

              setActiveCallSession({
                isOpen: true,
                isIncoming: true,
                targetUser: {
                  id: data.senderId,
                  displayName: data.senderName || 'Użytkownik AURA',
                  photoUrl: data.senderPhoto,
                  role: 'Member'
                },
                callType: data.callType || 'video',
                incomingSignalData: data
              });
            } else if (data.type === 'TYPING') {
              window.dispatchEvent(new CustomEvent('aura_typing_event', { detail: data }));
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isCancelled) {
            reconnectTimeout = setTimeout(connectGlobalSignal, 4000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {}
    };

    connectGlobalSignal();

    const handleOutgoingWsMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (ws && ws.readyState === WebSocket.OPEN && detail) {
        try {
          ws.send(JSON.stringify(detail));
        } catch {}
      }
    };
    window.addEventListener('aura_send_ws_message', handleOutgoingWsMessage);

    return () => {
      isCancelled = true;
      clearTimeout(reconnectTimeout);
      window.removeEventListener('aura_send_ws_message', handleOutgoingWsMessage);
      const activeWs = ws;
      if (activeWs) {
        // Prevent "WebSocket was closed before the connection was established" warning
        activeWs.onopen = null;
        activeWs.onmessage = null;
        activeWs.onerror = null;
        activeWs.onclose = null;
        if (activeWs.readyState === WebSocket.OPEN) {
          activeWs.close();
        } else if (activeWs.readyState === WebSocket.CONNECTING) {
          // If still connecting, wait for open before closing to cleanly avoid abort errors
          activeWs.onopen = () => {
            try { activeWs.close(); } catch {}
          };
        }
      }
    };
  }, [token, currentUser?.id, activeCallSession?.isOpen]);

  // Fetch current user details on load & listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const userDocRef = doc(db, 'users', fbUser.uid);
          let firestoreData = null;
          try {
            // Use short timeout race so UI loads immediately even if offline or network slow
            const docPromise = getDoc(userDocRef);
            const docTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
            const userDocSnap = await Promise.race([docPromise, docTimeout]);
            if (userDocSnap && 'exists' in userDocSnap && userDocSnap.exists()) {
              firestoreData = userDocSnap.data();
              if (firestoreData?.permissionsOnboardingHandled === true) {
                localStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
                setShowPermissionsModal(false);
              }
            }
          } catch (docErr: any) {
            console.warn('Notice reading profile from Firestore (continuing with auth details):', docErr?.message || docErr);
          }

          const formattedUser = formatUserAccount(fbUser, firestoreData);
          // Paid visibility is owned by the application server, not Firestore.
          formattedUser.profile.isBoosted = false;
          formattedUser.profile.boostExpiresAt = undefined;
          try {
            const boostResponse = await fetch('/api/profile/boost/status', {
              headers: { Authorization: `Bearer ${idToken}` },
              cache: 'no-store'
            });
            if (boostResponse.ok) {
              const boost = await boostResponse.json();
              formattedUser.profile.isBoosted = boost.isBoosted === true;
              formattedUser.profile.boostExpiresAt = typeof boost.boostExpiresAt === 'string' ? boost.boostExpiresAt : undefined;
            }
          } catch (boostError) {
            console.warn('Profile Booster status is temporarily unavailable:', boostError);
          }
          setCurrentUser(formattedUser);
          setToken(idToken);
          localStorage.setItem('aura_auth_token', idToken);
        } catch (err: any) {
          console.warn('Notice loading Firestore profile (using Auth profile fallback):', err?.message || err);
          try {
            const fallbackToken = await fbUser.getIdToken();
            const fallbackUser = formatUserAccount(fbUser, null);
            setCurrentUser(fallbackUser);
            setToken(fallbackToken);
            localStorage.setItem('aura_auth_token', fallbackToken);
          } catch (fallbackErr) {
            console.warn('Auth fallback notice:', fallbackErr);
          }
        } finally {
          setIsLoadingUser(false);
        }
      } else {
        // Fallback to API check if token exists in localStorage
        if (token) {
          fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => {
              if (!res.ok) throw new Error('Session expired');
              return res.json();
            })
            .then(data => {
              if (data.user) {
                setCurrentUser(data.user);
              } else {
                handleLogout();
              }
            })
            .catch(() => handleLogout())
            .finally(() => setIsLoadingUser(false));
        } else {
          setIsLoadingUser(false);
        }
      }
    });

    return () => unsubscribe();
  }, [token]);

  // Refresh the HttpOnly media cookie when the Firebase ID token rotates.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => {});
    return () => controller.abort();
  }, [token]);

  const handleAgeVerify = () => {
    localStorage.setItem('aura_18plus_verified', 'true');
    setIsAgeVerified(true);
    setShowPermissionsModal(shouldOfferPermissionsPrompt(
      localStorage.getItem(PERMISSIONS_PROMPTED_KEY) === 'true',
      currentUser?.permissionsOnboardingHandled === true,
      window.location.pathname,
      window.location.search
    ));
  };

  const markPermissionsHandled = () => {
    localStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
    setShowPermissionsModal(false);
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), {
        permissionsOnboardingHandled: true
      }).catch((error) => console.warn('Could not sync permission choice:', error));
    }
  };

  const handlePermissionsCompleted = (results: PermissionResults) => {
    markPermissionsHandled();
    if (results.coords && currentUser?.profile) {
      setCurrentUser({
        ...currentUser,
        profile: { ...currentUser.profile, lat: results.coords.lat, lng: results.coords.lng }
      });
    }
  };

  // Preserve an earlier choice when someone moves from the preview to the public app.
  useEffect(() => {
    if (!currentUser || !auth.currentUser || auth.currentUser.uid !== currentUser.id) return;
    if (currentUser.permissionsOnboardingHandled) {
      localStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
      setShowPermissionsModal(false);
    } else if (localStorage.getItem(PERMISSIONS_PROMPTED_KEY) === 'true') {
      updateDoc(doc(db, 'users', currentUser.id), {
        permissionsOnboardingHandled: true
      }).catch((error) => console.warn('Could not sync permission choice:', error));
    }
  }, [currentUser?.id, currentUser?.permissionsOnboardingHandled]);

  const handleLoginSuccess = (newToken: string, user: UserAccount) => {
    localStorage.setItem('aura_auth_token', newToken);
    setToken(newToken);
    setCurrentUser(user);

    setShowPermissionsModal(shouldOfferPermissionsPrompt(
      localStorage.getItem(PERMISSIONS_PROMPTED_KEY) === 'true',
      user.permissionsOnboardingHandled === true,
      window.location.pathname,
      window.location.search
    ));
  };

  const handleLogout = () => {
    logoutFirebase().catch(() => {});
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('aura_auth_token');
    localStorage.removeItem('aura_token');
    setToken(null);
    setCurrentUser(null);
  };

  const handleOpenChatWithUser = (targetUserId: string, initialMessage?: string) => {
    setActiveConversationId(targetUserId);
    setInitialChatMessage(initialMessage || null);
    setActiveTab('chat');
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        profile: updatedProfile
      });
    }
  };

  if (window.location.pathname === '/payment/pending') {
    return <CheckoutConfirmation pending />;
  }

  // Age Gate Modal check
  if (!isAgeVerified) {
    return <AgeGateModal onVerifyAge={handleAgeVerify} />;
  }

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <AuraLogo size={140} showText={true} badge={true} />
        <p className="mt-6 text-[#8a8f9d] text-xs font-semibold animate-pulse tracking-widest uppercase">
          Verifying Official AURA Environment...
        </p>
      </div>
    );
  }

  // Login / Registration flow if not authenticated
  if (!token || !currentUser) {
    return (
      <>
        <OnboardingFlow onComplete={({ token, user }) => handleLoginSuccess(token, user)} />
        <PermissionsPromptModal
          isOpen={showPermissionsModal && !isPaymentReturnLocation(window.location.pathname, window.location.search)}
          authToken={token}
          onClose={markPermissionsHandled}
          onCompleted={handlePermissionsCompleted}
        />
      </>
    );
  }

  if (window.location.pathname === '/payment/confirmation') {
    return <CheckoutConfirmation token={token} />;
  }

  if (window.location.pathname === '/boost/confirmation') {
    return <BoostConfirmation token={token} />;
  }

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'MODERATOR';

  return (
    <div className="min-h-screen bg-[#05060a] text-slate-100 relative overflow-x-hidden custom-scrollbar selection:bg-fuchsia-500/30 selection:text-white">
      {/* Ambient Moving Glow Orbs for Living Luxury Background */}
      <div className="fixed top-[-10%] left-1/4 -translate-x-1/2 w-[38rem] h-[38rem] bg-purple-700/[0.09] rounded-full blur-[160px] pointer-events-none animate-float-orb-1 will-change-transform" />
      <div className="fixed bottom-[-10%] right-1/4 translate-x-1/2 w-[42rem] h-[42rem] bg-fuchsia-700/[0.08] rounded-full blur-[170px] pointer-events-none animate-float-orb-2 will-change-transform" />
      <div className="fixed top-1/2 left-[-10%] w-[30rem] h-[30rem] bg-cyan-700/[0.05] rounded-full blur-[150px] pointer-events-none animate-float-orb-3 will-change-transform" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.035),transparent_70%)] pointer-events-none" />

      {/* Desktop Main Flex Container */}
      <div className="max-w-7xl mx-auto min-h-screen lg:grid lg:grid-cols-12 lg:gap-6 lg:p-6 lg:items-start">

        {/* Left Desktop Sidebar (Visible on LG screens) */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between sticky top-6 h-[calc(100vh-3rem)] aura-glass-card rounded-[32px] p-6 space-y-6">
          <div className="space-y-6">

            {/* Desktop Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0a0c12] border border-cyan-400/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/50 neon-glow-cyan">
                  <AuraLogoIcon className="w-full h-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(217,70,239,0.5)]">
                      AURA
                    </h1>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/60 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                      18+
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                    {t('verified_adult_network', 'Verified Adult Network')}
                  </span>
                </div>
              </div>
              <LanguagePickerButton showName={false} />
            </div>

            {/* User Quick Profile Tile */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3 hover:border-cyan-500/40 transition-colors">
              <img
                src={currentUser?.profile?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                alt="Profile"
                className="w-10 h-10 rounded-xl object-cover border border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser?.profile?.displayName || 'User'}</div>
                <div className="text-[10px] text-fuchsia-300 font-semibold">{currentUser?.profile?.identityRole || 'Member'}</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Online" />
            </div>

            {/* Desktop Navigation Items */}
            <nav className="space-y-1.5">
              {[
                { id: 'discover', label: t('nav_discover', 'Nearby Discover'), icon: Compass, color: 'text-purple-400' },
                { id: 'map', label: t('nav_radar', 'Google Maps Radar'), icon: MapPin, color: 'text-amber-400', badge: 'LIVE' },
                { id: 'matches', label: t('nav_matches', 'My Matches'), icon: Heart, color: 'text-rose-400' },
                { id: 'chat', label: t('nav_chat', 'Direct Messages'), icon: MessageSquare, color: 'text-cyan-400' },
                { id: 'profile', label: t('nav_profile', 'My Identity Profile'), icon: User, color: 'text-purple-300' },
                { id: 'settings', label: t('nav_settings', 'Settings & Security'), icon: Settings, color: 'text-slate-400' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as NavTab);
                      if (item.id !== 'chat') setActiveConversationId(null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/30 via-fuchsia-600/25 to-cyan-600/20 border border-fuchsia-400/60 text-white shadow-[0_4px_24px_rgba(217,70,239,0.35),0_0_15px_rgba(168,85,247,0.3)_inset]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-fuchsia-300 scale-110 drop-shadow-[0_0_12px_rgba(217,70,239,0.9)]' : item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-400/50 shadow-[0_0_8px_rgba(217,70,239,0.5)] animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>{t('nav_admin', 'Admin Moderation')}</span>
                </button>
              )}
            </nav>
          </div>

          <div className="text-[10px] text-slate-500 text-center border-t border-white/5 pt-4">
            AURA Gay 18+ Network © 2026
          </div>
        </aside>

        {/* Central App Card Frame */}
        <div className="lg:col-span-6 xl:col-span-6 min-h-screen lg:min-h-0 flex flex-col w-full sm:max-w-2xl md:max-w-4xl mx-auto lg:max-w-none relative shadow-2xl border-x lg:border border-white/10 lg:rounded-[32px] bg-[#0b0d14]">

          {/* App Header */}
          <header className="sticky top-0 z-30 bg-[#07080d]/95 backdrop-blur-xl border-b border-white/10 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#0a0c12] border border-cyan-400/40 p-0.5 flex items-center justify-center shadow-md shadow-cyan-950/50 neon-glow-cyan">
                <AuraLogoIcon className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 via-fuchsia-200 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">
                    Aura
                  </h1>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-fuchsia-400/60 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.4)]">
                    18+
                  </span>
                </div>
                <span className="text-[8.5px] font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1 leading-none">
                  <Shield className="w-2 h-2 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.9)]" />
                  {t('verified_adult_network', 'Verified Adult Network')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Multilingual Selector Pill */}
              <LanguagePickerButton />

              <button
                onClick={() => setActiveTab(activeTab === 'map' ? 'discover' : 'map')}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-all active:scale-95 text-[11px] ${
                  activeTab === 'map'
                    ? 'border-fuchsia-400/70 bg-fuchsia-500/25 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.4)] font-bold'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-cyan-400/40'
                }`}
                title="Toggle Google Maps Radar"
              >
                <MapPin className="w-3 h-3 text-fuchsia-400 animate-pulse" />
                <span className="font-semibold hidden sm:inline">{activeTab === 'map' ? t('radar_feed', 'Feed') : t('radar_title', 'Radar')}</span>
              </button>

              {activeTab === 'discover' && (
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10 hover:border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                  title={t('radar_filter', 'Filters')}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                </button>
              )}

              <PWAInstallButton />
            </div>
          </header>

          {/* Main Tab Content */}
          <main className="flex-1 pb-20 overflow-y-auto custom-scrollbar">
            {activeTab === 'discover' && (
              <DiscoverFeed
                authToken={token}
                currentUser={currentUser}
                onLikeProfile={(prof) => setSelectedProfile(prof)}
                onOpenChat={handleOpenChatWithUser}
                onSwitchToMap={() => setActiveTab('map')}
                onOpenPremium={() => setActiveTab('settings')}
                filter={filters}
                onFilterChange={setFilters}
                isFilterOpen={isFilterOpen}
                onOpenFilters={() => setIsFilterOpen(true)}
                onCloseFilters={() => setIsFilterOpen(false)}
              />
            )}

            {activeTab === 'map' && (
              <MapView
                authToken={token}
                currentUser={currentUser}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onOpenProfile={(prof) => setSelectedProfile(prof)}
                onOpenChat={handleOpenChatWithUser}
                onOpenPremium={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'matches' && (
              <MatchesView
                authToken={token}
                onOpenChat={handleOpenChatWithUser}
              />
            )}

            {activeTab === 'chat' && (
              <ChatView
                authToken={token}
                currentUserId={currentUser.id}
                initialTargetUserId={activeConversationId}
                initialMessage={initialChatMessage}
                onClearInitialMessage={() => setInitialChatMessage(null)}
                onClearTargetUser={() => setActiveConversationId(null)}
                onStartCall={handleStartCall}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileEditor
                profile={currentUser.profile}
                authToken={token}
                onProfileUpdated={handleUpdateProfile}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                currentUser={currentUser}
                authToken={token}
                onLogout={handleLogout}
                onSelectTab={(tab: NavTab) => setActiveTab(tab)}
                onUpdateUser={(updated) => setCurrentUser(updated)}
              />
            )}

            {activeTab === 'admin' && (
              <AdminDashboard
                authToken={token}
              />
            )}
          </main>

          {/* Persistent Bottom Navigation Bar */}
          <Navigation
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'chat') {
                setActiveConversationId(null);
              }
            }}
            currentUser={currentUser}
            unreadCount={0}
          />
        </div>

        {/* Right Desktop Info Panel (Visible on XL screens) */}
        <aside className="hidden xl:flex xl:col-span-3 flex-col sticky top-6 h-[calc(100vh-3rem)] aura-glass-card rounded-[32px] p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              <span>Network Telemetry</span>
            </h3>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Encrypted & Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Online Nearby</span>
                <span className="text-white font-black">28 Verified</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Verification</span>
                <span className="text-purple-300 font-bold">18+ Adult Pass</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-fuchsia-500/20 space-y-2 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-fuchsia-200">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Verified Safe Spaces</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Explore real-time radar, verified local queer profiles, and private encrypted chat.
              </p>
            </div>
          </div>
        </aside>

      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          authToken={token || ''}
          onLike={(prof) => {
            fetch('/api/likes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ targetUserId: prof.userId })
            }).catch(() => {});
          }}
          onOpenChat={(targetUserId, initialMsg) => {
            setSelectedProfile(null);
            handleOpenChatWithUser(targetUserId, initialMsg);
          }}
          onReport={(prof, reason) => {
            fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ reportedUserId: prof.userId, reason })
            }).catch(() => {});
          }}
          onBlock={(targetUserId) => {
            fetch('/api/blocks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ blockedUserId: targetUserId })
            }).catch(() => {});
          }}
          onStartCall={handleStartCall}
        />
      )}

      {/* Global 1:1 Video & Voice Call Modal */}
      {activeCallSession?.isOpen && currentUser && (
        <VideoCallModal
          isOpen={activeCallSession.isOpen}
          isIncoming={activeCallSession.isIncoming}
          currentUserId={currentUser.id}
          targetUser={activeCallSession.targetUser}
          authToken={token || ''}
          incomingSignalData={activeCallSession.incomingSignalData}
          callType={activeCallSession.callType}
          onClose={() => setActiveCallSession(null)}
        />
      )}

      {/* System Permissions Request Modal */}
      <PermissionsPromptModal
        isOpen={showPermissionsModal && !isPaymentReturnLocation(window.location.pathname, window.location.search)}
        authToken={token}
        onClose={markPermissionsHandled}
        onCompleted={handlePermissionsCompleted}
      />

      {/* Mandatory First-Time Profile Info & Photo Setup Modal */}
      {currentUser && token && (
        <ProfileSetupRequiredModal
          isOpen={(() => {
            const hasCompletedSetup = localStorage.getItem(`aura_profile_completed_${currentUser.id}`) === 'true';
            if (hasCompletedSetup) return false;
            const profile = currentUser.profile;
            const hasPhoto = Boolean(profile?.photos && profile.photos.length > 0 && profile.photos[0]?.url);
            const hasName = Boolean(profile?.displayName && profile.displayName.trim().length > 0 && !profile.displayName.startsWith('Member #') && profile.displayName !== 'User' && profile.displayName !== 'AURA Member');
            const hasBio = Boolean(profile?.bio && profile.bio.trim().length > 0);
            return !hasPhoto || !hasName || !hasBio;
          })()}
          currentUser={currentUser}
          authToken={token}
          onCompleted={(updatedProfile) => {
            localStorage.setItem(`aura_profile_completed_${currentUser.id}`, 'true');
            handleUpdateProfile(updatedProfile);
          }}
        />
      )}
    </div>
  );
}
