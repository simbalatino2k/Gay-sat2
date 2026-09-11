import React from 'react';
import {
  Shield, CloudOff, HardDrive, Clock, Lock, Unlock, X, Cloud, CheckCircle2, ShieldCheck
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
  onRequestVaultAccess
}) => {
  if (!isOpen) return null;

  const isAutoBackupDisabled = !!(
    conversation.settings?.disableAutoBackup ?? conversation.disableAutoBackup
  );

  const formatTtlRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'wygasa zaraz';
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

  return (
    <div
      id="chat-settings-drawer"
      className="border-b border-white/[0.08] bg-gradient-to-b from-[#141226] via-[#0d0f1c] to-[#090b14] p-4 space-y-3.5 shrink-0 animate-in slide-in-from-top-2 duration-200"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Ustawienia Czatu & Prywatność
            </h4>
            <p className="text-[10px] text-slate-400">
              Konfiguracja kopii zapasowej, retencji wiadomości i prywatnego skarbca
            </p>
          </div>
        </div>
        <button
          id="chat-settings-close-btn"
          type="button"
          onClick={onClose}
          className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-1 transition-colors min-h-[36px]"
        >
          <X className="w-3.5 h-3.5" />
          <span>Zamknij</span>
        </button>
      </div>

      {/* Disable Auto-Backup Toggle Card */}
      <div
        id="disable-auto-backup-card"
        className={`p-3 rounded-2xl border transition-all duration-200 ${
          isAutoBackupDisabled
            ? 'bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
            : 'bg-white/[0.02] border-white/[0.06]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-lg ${
                  isAutoBackupDisabled
                    ? 'bg-cyan-500/25 text-cyan-300'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {isAutoBackupDisabled ? (
                  <CloudOff className="w-4 h-4" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>
              <span className="text-[11.5px] font-bold text-white">
                Disable Auto-Backup (Wyłącz automatyczną kopię chmurową)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Gdy ta flaga jest włączona, ta konkretna konwersacja oraz jej wiadomości są
              całkowicie pomijane przez usługę automatycznych kopii zapasowych w chmurze
              (Cloud Backups) oraz eksportów GDPR. Wiadomości są przechowywane wyłącznie
              lokalnie na Twoim urządzeniu.
            </p>
          </div>

          <button
            id="disable-auto-backup-toggle"
            type="button"
            disabled={updatingSettings}
            onClick={onToggleDisableAutoBackup}
            className={`px-3 py-2 rounded-full text-[10px] font-black tracking-wide border transition-all active:scale-95 shrink-0 flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
              isAutoBackupDisabled
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
            title={
              isAutoBackupDisabled
                ? 'Wiadomości tej rozmowy nie trafiają do kopii chmurowej'
                : 'Kliknij, aby odłączyć rozmowę od automatycznej kopii chmurowej'
            }
          >
            {isAutoBackupDisabled ? (
              <>
                <HardDrive className="w-3.5 h-3.5 text-cyan-300" />
                <span>TYLKO LOKALNIE</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span>KOPIA CHMUROWA</span>
              </>
            )}
          </button>
        </div>

        {isAutoBackupDisabled && (
          <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex items-center gap-1.5 text-[9.5px] text-cyan-300 font-medium">
            <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>
              Aktywny tryb lokalny: Wiadomości są zabezpieczone przed automatyczną synchronizacją z serwerem kopii zapasowych.
            </span>
          </div>
        )}
      </div>

      {/* Message Expiration / TTL Selector */}
      <div
        id="ttl-selector-container"
        className="space-y-2 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.06]"
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Czas życia wiadomości (Znikające wiadomości)</span>
          </span>
          <span className="text-[10px] font-semibold text-amber-300">
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
                className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 min-h-[44px] flex items-center justify-center ${
                  isSelected
                    ? 'border-amber-400/70 bg-amber-500/25 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 leading-snug">
          💡 Wiadomości znikną automatycznie po wyznaczonym czasie. Pojedyncze wiadomości możesz zapisać na stałe ikoną pinezki 📌.
        </p>
      </div>

      {/* Private Vault / Skarbiec Permissions */}
      <div
        id="vault-access-section"
        className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.06] space-y-2"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Dostęp do Prywatnego Skarbca (Album ze zdjęciami)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Your Vault for Them */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-1.5 flex flex-col justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-slate-200">
                Twój Skarbiec dla {conversation.otherParticipant?.displayName}
              </p>
              <p className="text-[10px] text-slate-400">
                {vaultStatus.theyHaveAccessToMine
                  ? 'Użytkownik ma dostęp do Twoich ukrytych zdjęć.'
                  : 'Ukryte zdjęcia są zablokowane.'}
              </p>
            </div>
            <button
              id="vault-grant-btn"
              type="button"
              onClick={() => onGrantVaultAccess(!vaultStatus.theyHaveAccessToMine)}
              className={`w-full py-2 rounded-lg text-[10.5px] font-bold border transition active:scale-95 flex items-center justify-center gap-1.5 min-h-[44px] ${
                vaultStatus.theyHaveAccessToMine
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                  : 'border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              }`}
            >
              {vaultStatus.theyHaveAccessToMine ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
              <span>
                {vaultStatus.theyHaveAccessToMine
                  ? 'Odbierz dostęp do skarbca'
                  : 'Udostępnij prywatny skarbiec'}
              </span>
            </button>
          </div>

          {/* Their Vault for You */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.07] space-y-1.5 flex flex-col justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-slate-200">
                Skarbiec użytkownika {conversation.otherParticipant?.displayName}
              </p>
              <p className="text-[10px] text-slate-400">
                {vaultStatus.iHaveAccessToTheirs
                  ? 'Masz odblokowany dostęp do prywatnego albumu!'
                  : 'Prywatny album jest zablokowany.'}
              </p>
            </div>
            {vaultStatus.iHaveAccessToTheirs ? (
              <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-2 px-2 rounded-lg text-center flex items-center justify-center gap-1 min-h-[44px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Album odblokowany</span>
              </div>
            ) : onRequestVaultAccess ? (
              <button
                type="button"
                disabled={vaultStatus.iRequestedTheirs}
                onClick={onRequestVaultAccess}
                className="w-full py-2 rounded-lg text-[10.5px] font-bold border border-purple-500/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Lock className="w-3 h-3 text-purple-300" />
                <span>{vaultStatus.iRequestedTheirs ? 'Wysłano prośbę ⏳' : 'Poproś o dostęp do albumu'}</span>
              </button>
            ) : (
              <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 py-2 px-2 rounded-lg text-center flex items-center justify-center gap-1 min-h-[44px]">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Album zablokowany</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
