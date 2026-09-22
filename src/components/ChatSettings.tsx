import React, { useState, useEffect } from 'react';
import {
  Shield, CloudOff, HardDrive, Clock, Lock, Unlock, X, Cloud, CheckCircle2, ShieldCheck,
  Ban, Flag, AlertTriangle
} from 'lucide-react';
import { Conversation } from '../types';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  updatingSettings: boolean;
  onSetMessageTtl: (ttl: number | null) => Promise<void>;
  onToggleDisableAutoBackup: () => Promise<void>;
  vaultStatus: {
    theyHaveAccessToMine: boolean;
    iHaveAccessToTheirs: boolean;
    iRequestedTheirs?: boolean;
  };
  onGrantVaultAccess: (grant: boolean) => Promise<void>;
  onRequestVaultAccess?: () => Promise<void>;
  onBlockUser: () => void;
  onReportUser: () => void;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  isOpen,
  onClose,
  conversation,
  updatingSettings,
  onSetMessageTtl,
  onToggleDisableAutoBackup,
  vaultStatus,
  onGrantVaultAccess,
  onRequestVaultAccess,
  onBlockUser,
  onReportUser
}) => {
  const [confirmingBlock, setConfirmingBlock] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmingBlock(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAutoBackupDisabled = !!(
    conversation.settings?.disableAutoBackup ?? conversation.disableAutoBackup
  );

  const formatTtlRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'zaraz';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d`;
  };

  const ttlOptions = [
    { label: 'Stałe', val: null },
    { label: '30s', val: 30 },
    { label: '5 min', val: 300 },
    { label: '1 godz.', val: 3600 },
    { label: '24 godz.', val: 86400 },
    { label: '7 dni', val: 604800 }
  ];

  const participantName = conversation.otherParticipant?.displayName || 'Rozmówca';

  return (
    <div
      id="chat-settings-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#141226] via-[#0e101f] to-[#090b14] border border-white/10 rounded-[28px] p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">
                Ustawienia Czatu
              </h3>
              <p className="text-[10px] text-slate-400">
                Prywatność i konfiguracja z {participantName}
              </p>
            </div>
          </div>
          <button
            id="chat-settings-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95"
            title="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Znikające Wiadomości (TTL) */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Znikające wiadomości</span>
            </div>
            <span className="text-[10px] font-bold text-amber-300">
              {conversation.settings?.messageTtlSeconds
                ? formatTtlRemaining(
                    new Date(
                      Date.now() + conversation.settings.messageTtlSeconds * 1000
                    ).toISOString()
                  )
                : 'Stałe (brak limitu)'}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {ttlOptions.map((opt) => {
              const isSelected =
                conversation.settings?.messageTtlSeconds === opt.val ||
                (!conversation.settings?.messageTtlSeconds && opt.val === null);
              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={updatingSettings}
                  onClick={() => onSetMessageTtl(opt.val)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition active:scale-95 flex items-center justify-center ${
                    isSelected
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                      : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400">
            Wiadomości wygasają automatycznie po wybranym czasie.
          </p>
        </div>

        {/* 2. Kopia Zapasowa (Lokalna vs Chmurowa) */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isAutoBackupDisabled
              ? 'bg-cyan-950/20 border-cyan-500/30'
              : 'bg-white/[0.03] border-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAutoBackupDisabled ? (
                <CloudOff className="w-4 h-4 text-cyan-400" />
              ) : (
                <Cloud className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-bold text-white">Kopia zapasowa</span>
            </div>
            <button
              id="disable-auto-backup-toggle"
              type="button"
              disabled={updatingSettings}
              onClick={onToggleDisableAutoBackup}
              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition active:scale-95 flex items-center gap-1.5 ${
                isAutoBackupDisabled
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {isAutoBackupDisabled ? (
                <>
                  <HardDrive className="w-3 h-3 text-cyan-300" />
                  <span>TYLKO LOKALNIE</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-slate-400" />
                  <span>CHMURA</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-2 leading-snug">
            {isAutoBackupDisabled
              ? 'Aktywny tryb lokalny: rozmowa nie trafia do chmury kopii zapasowych.'
              : 'Rozmowa synchronizuje się z chmurą AURA Direct.'}
          </p>
        </div>

        {/* 3. Prywatny Skarbiec (Album zdjęć) */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-bold text-white">Prywatny Skarbiec ze zdjęciami</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Twój album */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-2 flex flex-col justify-between">
              <div>
                <p className="text-[10.5px] font-bold text-slate-200">Twój Skarbiec</p>
                <p className="text-[10px] text-slate-400">
                  {vaultStatus.theyHaveAccessToMine ? 'Odblokowany dla rozmówcy' : 'Zablokowany'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onGrantVaultAccess(!vaultStatus.theyHaveAccessToMine)}
                className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold border transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  vaultStatus.theyHaveAccessToMine
                    ? 'border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                    : 'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                }`}
              >
                {vaultStatus.theyHaveAccessToMine ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{vaultStatus.theyHaveAccessToMine ? 'Odbierz dostęp' : 'Udostępnij album'}</span>
              </button>
            </div>

            {/* Ich album */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-2 flex flex-col justify-between">
              <div>
                <p className="text-[10.5px] font-bold text-slate-200">Album {participantName}</p>
                <p className="text-[10px] text-slate-400">
                  {vaultStatus.iHaveAccessToTheirs ? 'Masz dostęp do zdjęć' : 'Album jest ukryty'}
                </p>
              </div>
              {vaultStatus.iHaveAccessToTheirs ? (
                <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-1.5 px-2 rounded-lg text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Odblokowany</span>
                </div>
              ) : onRequestVaultAccess ? (
                <button
                  type="button"
                  disabled={vaultStatus.iRequestedTheirs}
                  onClick={onRequestVaultAccess}
                  className="w-full py-1.5 px-2 rounded-lg text-[10px] font-bold border border-purple-500/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3 text-purple-300" />
                  <span>{vaultStatus.iRequestedTheirs ? 'Wysłano prośbę ⏳' : 'Poproś o dostęp'}</span>
                </button>
              ) : (
                <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 py-1.5 px-2 rounded-lg text-center flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Zablokowany</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Bezpieczeństwo i Blokowanie Użytkownika (Block User) */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white">Bezpieczeństwo & Blokowanie</span>
            </div>
            <span className="text-[10px] text-rose-300 font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              Prywatność
            </span>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-snug">
            Zablokuj użytkownika, aby natychmiast zapobiec dalszym interakcjom — użytkownik nie będzie mógł wysyłać Ci wiadomości, dzwonić ani przeglądać Twojego profilu.
          </p>

          {confirmingBlock ? (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-rose-200">
                    Czy na pewno chcesz zablokować {participantName}?
                  </p>
                  <p className="text-[10px] text-rose-300/80 leading-snug">
                    Użytkownik zostanie trwale odcięty od możliwości kontaktu z Tobą. Czaty zostaną usunięte.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="confirm-block-user-btn"
                  type="button"
                  disabled={updatingSettings}
                  onClick={() => {
                    onBlockUser();
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg shadow-rose-900/30 disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Potwierdź blokadę</span>
                </button>
                <button
                  id="cancel-block-user-btn"
                  type="button"
                  disabled={updatingSettings}
                  onClick={() => setConfirmingBlock(false)}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                id="block-user-btn"
                type="button"
                disabled={updatingSettings}
                onClick={() => setConfirmingBlock(true)}
                className="py-2.5 px-3 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                title="Block User - Prevent further interaction"
              >
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Block User</span>
              </button>
              <button
                id="report-user-btn"
                type="button"
                disabled={updatingSettings}
                onClick={() => {
                  onClose();
                  onReportUser();
                }}
                className="py-2.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                title="Report User"
              >
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>Zgłoś profil</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
