import React from 'react';
import { Compass, Heart, MessageSquare, User, Sparkles, MapPin } from 'lucide-react';
import { UserAccount } from '../types';
import { useTranslation } from '../context/LanguageContext';

export type NavTab = 'discover' | 'map' | 'matches' | 'chat' | 'profile' | 'settings' | 'admin';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserAccount | null;
  unreadCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  unreadCount
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Persistent Bottom Navigation Bar - Fixed, Ultra-Compact & Slim */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-[#070810]/95 backdrop-blur-3xl px-1.5 py-0.5 pb-[max(0.15rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.85)]">
        <div className="max-w-xs sm:max-w-sm mx-auto flex items-center justify-around w-full">
          
          {/* Discover Tab */}
          <button
            onClick={() => onSelectTab('discover')}
            className={`flex flex-col items-center justify-center min-w-[40px] min-h-[36px] px-1 py-0.5 rounded-lg transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'discover'
                ? 'text-purple-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'discover' && (
              <div className="absolute inset-0 rounded-lg bg-purple-500/[0.15] border border-purple-400/40 pointer-events-none transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.25)_inset]" />
            )}
            <Compass className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'discover' ? 'stroke-[2.5px] scale-105 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'group-hover:scale-105'}`} />
            <span className="text-[8.5px] mt-0.5 tracking-tight relative z-10 leading-none">{t('nav_discover', 'Discover')}</span>
            {activeTab === 'discover' && (
              <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.9)]" />
            )}
          </button>

          {/* Radar Map Tab */}
          <button
            onClick={() => onSelectTab('map')}
            className={`flex flex-col items-center justify-center min-w-[40px] min-h-[36px] px-1 py-0.5 rounded-lg transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'map'
                ? 'text-fuchsia-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'map' && (
              <div className="absolute inset-0 rounded-lg bg-fuchsia-500/[0.15] border border-fuchsia-400/40 pointer-events-none transition-all duration-300 shadow-[0_0_10px_rgba(217,70,239,0.25)_inset]" />
            )}
            <MapPin className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'map' ? 'stroke-[2.5px] scale-105 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 'group-hover:scale-105'}`} />
            <span className="text-[8.5px] mt-0.5 tracking-tight relative z-10 leading-none">{t('nav_radar', 'Radar')}</span>
            {activeTab === 'map' && (
              <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.9)]" />
            )}
          </button>

          {/* Matches Tab */}
          <button
            onClick={() => onSelectTab('matches')}
            className={`flex flex-col items-center justify-center min-w-[40px] min-h-[36px] px-1 py-0.5 rounded-lg transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'matches'
                ? 'text-rose-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'matches' && (
              <div className="absolute inset-0 rounded-lg bg-rose-500/[0.15] border border-rose-400/40 pointer-events-none transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.25)_inset]" />
            )}
            <Heart className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'matches' ? 'stroke-[2.5px] scale-105 text-rose-400 fill-rose-500/30 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'group-hover:scale-105'}`} />
            <span className="text-[8.5px] mt-0.5 tracking-tight relative z-10 leading-none">{t('nav_matches', 'Matches')}</span>
            {activeTab === 'matches' && (
              <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
            )}
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => onSelectTab('chat')}
            className={`flex flex-col items-center justify-center min-w-[40px] min-h-[36px] px-1 py-0.5 rounded-lg transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'chat'
                ? 'text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'chat' && (
              <div className="absolute inset-0 rounded-lg bg-cyan-500/[0.15] border border-cyan-400/40 pointer-events-none transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.25)_inset]" />
            )}
            <div className="relative">
              <MessageSquare className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'chat' ? 'stroke-[2.5px] scale-105 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:scale-105'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2.5 min-w-2.5 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-0.5 text-[7px] font-black text-white shadow-md">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[8.5px] mt-0.5 tracking-tight relative z-10 leading-none">{t('nav_chat', 'Chat')}</span>
            {activeTab === 'chat' && (
              <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
            )}
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => onSelectTab('profile')}
            className={`flex flex-col items-center justify-center min-w-[40px] min-h-[36px] px-1 py-0.5 rounded-lg transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'profile' || activeTab === 'settings'
                ? 'text-purple-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {(activeTab === 'profile' || activeTab === 'settings') && (
              <div className="absolute inset-0 rounded-lg bg-purple-500/[0.15] border border-purple-400/40 pointer-events-none transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.25)_inset]" />
            )}
            {currentUser?.profile?.photos?.[0]?.url ? (
              <img
                src={currentUser.profile.photos?.[0]?.url}
                alt="Profile"
                referrerPolicy="no-referrer"
                className={`w-3.5 h-3.5 rounded-full object-cover border transition-all duration-300 ${
                  activeTab === 'profile' || activeTab === 'settings' ? 'border-purple-400 ring-1 ring-purple-400/60 scale-105 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'border-white/20 group-hover:scale-105'
                }`}
              />
            ) : (
              <User className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'profile' || activeTab === 'settings' ? 'stroke-[2.5px] scale-105 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'group-hover:scale-105'}`} />
            )}
            <span className="text-[8.5px] mt-0.5 tracking-tight relative z-10 leading-none">{t('nav_profile', 'Profile')}</span>
            {(activeTab === 'profile' || activeTab === 'settings') && (
              <span className="absolute bottom-0.5 w-1.5 h-0.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.9)]" />
            )}
          </button>

        </div>
      </nav>
    </>
  );
};
