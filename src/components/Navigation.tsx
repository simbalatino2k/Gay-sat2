import React from 'react';
import { Compass, Heart, MessageSquare, User, Sparkles, MapPin } from 'lucide-react';
import { UserAccount } from '../types';

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
  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.09] bg-[#070810]/95 backdrop-blur-3xl px-2 py-1.5 shadow-[0_-12px_36px_rgba(0,0,0,0.85)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* Discover Tab */}
          <button
            onClick={() => onSelectTab('discover')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] px-1.5 py-1 rounded-2xl transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'discover'
                ? 'text-purple-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'discover' && (
              <div className="absolute inset-0 rounded-2xl bg-purple-500/[0.12] border border-purple-500/25 pointer-events-none transition-all duration-300 shadow-[0_0_16px_rgba(168,85,247,0.2)_inset]" />
            )}
            <Compass className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'discover' ? 'stroke-[2.5px] scale-110 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]' : 'group-hover:scale-105'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight relative z-10">Discover</span>
            {activeTab === 'discover' && (
              <span className="absolute bottom-1 w-2.5 h-0.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)]" />
            )}
          </button>

          {/* Radar Map Tab */}
          <button
            onClick={() => onSelectTab('map')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[50px] px-1.5 py-1 rounded-2xl transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'map'
                ? 'text-fuchsia-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'map' && (
              <div className="absolute inset-0 rounded-2xl bg-fuchsia-500/[0.12] border border-fuchsia-500/25 pointer-events-none transition-all duration-300 shadow-[0_0_16px_rgba(217,70,239,0.2)_inset]" />
            )}
            <MapPin className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'map' ? 'stroke-[2.5px] scale-110 text-fuchsia-300 drop-shadow-[0_0_12px_rgba(217,70,239,0.7)]' : 'group-hover:scale-105'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight relative z-10">Radar</span>
            {activeTab === 'map' && (
              <span className="absolute bottom-1 w-2.5 h-0.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.9)]" />
            )}
          </button>

          {/* Matches Tab */}
          <button
            onClick={() => onSelectTab('matches')}
            className={`flex flex-col items-center justify-center min-w-[58px] min-h-[50px] px-2 py-1 rounded-2xl transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'matches'
                ? 'text-rose-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'matches' && (
              <div className="absolute inset-0 rounded-2xl bg-rose-500/[0.12] border border-rose-500/25 pointer-events-none transition-all duration-300 shadow-[0_0_16px_rgba(244,63,94,0.2)_inset]" />
            )}
            <Heart className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'matches' ? 'stroke-[2.5px] scale-110 text-rose-400 fill-rose-500/30 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]' : 'group-hover:scale-105'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight relative z-10">Matches</span>
            {activeTab === 'matches' && (
              <span className="absolute bottom-1 w-2.5 h-0.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
            )}
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => onSelectTab('chat')}
            className={`flex flex-col items-center justify-center min-w-[58px] min-h-[50px] px-2 py-1 rounded-2xl transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'chat'
                ? 'text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'chat' && (
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/[0.12] border border-cyan-500/25 pointer-events-none transition-all duration-300 shadow-[0_0_16px_rgba(6,182,212,0.2)_inset]" />
            )}
            <div className="relative">
              <MessageSquare className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'chat' ? 'stroke-[2.5px] scale-110 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]' : 'group-hover:scale-105'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-1 text-[8.5px] font-black text-white shadow-md">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight relative z-10">Chat</span>
            {activeTab === 'chat' && (
              <span className="absolute bottom-1 w-2.5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
            )}
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => onSelectTab('profile')}
            className={`flex flex-col items-center justify-center min-w-[58px] min-h-[50px] px-2 py-1 rounded-2xl transition-all duration-300 relative active:scale-95 group ${
              activeTab === 'profile'
                ? 'text-purple-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeTab === 'profile' && (
              <div className="absolute inset-0 rounded-2xl bg-purple-500/[0.12] border border-purple-500/25 pointer-events-none transition-all duration-300 shadow-[0_0_16px_rgba(168,85,247,0.2)_inset]" />
            )}
            {currentUser?.profile?.photos?.[0]?.url ? (
              <img
                src={currentUser.profile.photos[0].url}
                alt="Profile"
                referrerPolicy="no-referrer"
                className={`w-5 h-5 rounded-full object-cover border transition-all duration-300 ${
                  activeTab === 'profile' ? 'border-purple-400 ring-2 ring-purple-400/50 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.7)]' : 'border-white/20 group-hover:scale-105'
                }`}
              />
            ) : (
              <User className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'profile' ? 'stroke-[2.5px] scale-110 text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]' : 'group-hover:scale-105'}`} />
            )}
            <span className="text-[10px] mt-0.5 tracking-tight relative z-10">Profile</span>
            {activeTab === 'profile' && (
              <span className="absolute bottom-1 w-2.5 h-0.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.9)]" />
            )}
          </button>

        </div>
      </nav>
    </>
  );
};
