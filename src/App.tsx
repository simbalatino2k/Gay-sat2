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
import { Shield, ShieldCheck, Sparkles, SlidersHorizontal, Compass, Heart, MessageSquare, User, Settings, Lock, Radio, MapPin } from 'lucide-react';
import { AuraLogo, AuraLogoIcon } from './components/AuraLogo';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { formatUserAccount, logoutFirebase } from './services/firebaseService';
import { useBackgroundNotifications } from './hooks/useBackgroundNotifications';

export default function App() {
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('aura_18plus_verified') === 'true';
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('aura_auth_token');
  });

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

  // Fetch current user details on load & listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const userDocRef = doc(db, 'users', fbUser.uid);
          let firestoreData = null;
          try {
            const userDocSnap = await getDoc(userDocRef);
            firestoreData = userDocSnap.exists() ? userDocSnap.data() : null;
          } catch (docErr: any) {
            console.warn('Notice reading profile from Firestore (continuing with auth details):', docErr?.message || docErr);
          }

          const formattedUser = formatUserAccount(fbUser, firestoreData);
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

  const handleAgeVerify = () => {
    localStorage.setItem('aura_18plus_verified', 'true');
    setIsAgeVerified(true);
  };

  const handleLoginSuccess = (newToken: string, user: UserAccount) => {
    localStorage.setItem('aura_auth_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
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
    return <OnboardingFlow onComplete={({ token, user }) => handleLoginSuccess(token, user)} />;
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0a0c12] border border-white/10 p-1 flex items-center justify-center shadow-lg shadow-purple-950/50">
                <AuraLogoIcon className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                    AURA
                  </h1>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
                    18+
                  </span>
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-purple-400/90 uppercase flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" />
                  Verified Queer Adult Network
                </span>
              </div>
            </div>

            {/* User Quick Profile Tile */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <img
                src={currentUser?.profile?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                alt="Profile"
                className="w-10 h-10 rounded-xl object-cover border border-purple-400/50"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser?.profile?.displayName || 'User'}</div>
                <div className="text-[10px] text-fuchsia-300 font-semibold">{currentUser?.profile?.identityRole || 'Member'}</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Online" />
            </div>

            {/* Desktop Navigation Items */}
            <nav className="space-y-1.5">
              {[
                { id: 'discover', label: 'Nearby Discover', icon: Compass, color: 'text-purple-400' },
                { id: 'map', label: 'Google Maps Radar', icon: MapPin, color: 'text-amber-400', badge: 'MAP' },
                { id: 'matches', label: 'My Matches', icon: Heart, color: 'text-rose-400' },
                { id: 'chat', label: 'Direct Messages', icon: MessageSquare, color: 'text-cyan-400' },
                { id: 'profile', label: 'My Identity Profile', icon: User, color: 'text-purple-300' },
                { id: 'settings', label: 'Settings & Security', icon: Settings, color: 'text-slate-400' },
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
                        ? 'bg-gradient-to-r from-purple-600/30 via-fuchsia-600/20 to-transparent border border-fuchsia-500/40 text-white shadow-[0_4px_24px_rgba(217,70,239,0.2),0_0_12px_rgba(168,85,247,0.15)_inset]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-fuchsia-300 scale-110 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]' : item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 animate-pulse">
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
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin Moderation</span>
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
          <header className="sticky top-0 z-30 bg-[#07080d]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#0a0c12] border border-white/10 p-1 flex items-center justify-center shadow-lg shadow-purple-950/50">
                <AuraLogoIcon className="w-full h-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
                    Aura
                  </h1>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-fuchsia-500/30 text-fuchsia-300">
                    18+
                  </span>
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-purple-400/90 uppercase flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" />
                  Verified Adult Network
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'map' ? 'discover' : 'map')}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === 'map'
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.25)] font-bold'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                }`}
                title="Toggle Google Maps Radar"
              >
                <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-xs font-semibold hidden sm:inline">{activeTab === 'map' ? 'Feed' : 'Radar'}</span>
              </button>

              {activeTab === 'discover' && (
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
                  title="Filters"
                >
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
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
          authToken={token}
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
        />
      )}
    </div>
  );
}

