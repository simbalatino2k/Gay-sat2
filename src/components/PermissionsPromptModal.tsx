import React, { useState } from 'react';
import { MapPin, Camera, Mic, CheckCircle2, Shield, Flame, X, Sparkles } from 'lucide-react';
import { requestAllPermissionsOnLogin, PermissionResults } from '../services/permissionsService';
import { PERMISSIONS_PROMPTED_KEY } from '../lib/permissionsPrompt';

interface PermissionsPromptModalProps {
  authToken: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (results: PermissionResults) => void;
}

export const PermissionsPromptModal: React.FC<PermissionsPromptModalProps> = ({
  authToken,
  isOpen,
  onClose,
  onCompleted
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [results, setResults] = useState<PermissionResults | null>(null);
  const [selected, setSelected] = useState({ location: false, camera: false, microphone: false });
  const dismiss = () => onClose();

  if (!isOpen) return null;

  const handleGrantAll = async () => {
    // A selected permission is a user response even if the browser prompt is dismissed.
    localStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
    setIsRequesting(true);
    try {
      const res = await requestAllPermissionsOnLogin(authToken, undefined, selected);
      setResults(res);
      onCompleted(res);
      // Auto close after brief success display if location was granted
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.warn('Błąd przyznawania uprawnień:', e);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#0a0c16] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-600/15 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/15 rounded-full blur-[70px] pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Wybierz uprawnienia AURA
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold">
                  18+
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lokalizacja, Aparat i Mikrofon dla pełnych funkcji aplikacji
              </p>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature List */}
        <div className="space-y-3 relative z-10">
          {/* Geolocation */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Lokalizacja GPS</span>
                {results?.locationGranted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Przyznano
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-purple-300 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" /> Cruising & Miejsca LGBT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Wyszukiwanie osób w pobliżu oraz natychmiastowe oznaczanie stref cruisingu i saun.
              </p>
            </div>
          </div>

          {/* Camera */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Aparat fotograficzny</span>
                {results?.cameraGranted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Przyznano
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">Zdjęcia & Wideo</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bezpieczna weryfikacja tożsamości, zdjęcia profilowe i wysyłanie fotek w czacie.
              </p>
            </div>
          </div>

          {/* Microphone */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Mikrofon</span>
                {results?.microphoneGranted ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Przyznano
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">Notatki głosowe</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nagrywanie szybkich wiadomości audio w prywatnych rozmowach.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 relative z-10 space-y-2">
          {([
            ['location', 'Lokalizacja'],
            ['camera', 'Aparat'],
            ['microphone', 'Mikrofon']
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-slate-200">
              <input type="checkbox" checked={selected[key]} disabled={isRequesting}
                onChange={event => setSelected(prev => ({ ...prev, [key]: event.target.checked }))} />
              {label}
            </label>
          ))}
          <button
            onClick={handleGrantAll}
            disabled={isRequesting || !Object.values(selected).some(Boolean)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-bold text-xs tracking-wide uppercase hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(217,70,239,0.35)] disabled:opacity-60 cursor-pointer"
          >
            {isRequesting ? (
              <span className="animate-pulse">Wysyłanie zapytań do przeglądarki...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Włącz wybrane uprawnienia</span>
              </>
            )}
          </button>

          <button
            onClick={dismiss}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Pomiń na razie (możesz włączyć później w ustawieniach)
          </button>
        </div>
      </div>
    </div>
  );
};
