import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  Loader2, 
  AlertCircle, 
  Check, 
  Star, 
  ExternalLink, 
  Download, 
  ShieldAlert, 
  HelpCircle,
  Sparkles,
  Info,
  ArrowRight
} from 'lucide-react';
import { AlbumImportCandidate } from '../lib/albumImporter';

interface ImportAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  currentPhotoCount: number;
  onPhotosImported: (newPhotos: Array<{ id: string; url: string; isPrimary: boolean }>) => void;
}

export const ImportAlbumModal: React.FC<ImportAlbumModalProps> = ({
  isOpen,
  onClose,
  authToken,
  currentPhotoCount,
  onPhotosImported
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectSuggestion, setInspectSuggestion] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Inspected album state
  const [albumTitle, setAlbumTitle] = useState<string>('');
  const [provider, setProvider] = useState<'icloud' | 'google_photos' | 'unsupported'>('unsupported');
  const [candidates, setCandidates] = useState<AlbumImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<Array<{ id: string; success: boolean; error?: string }>>([]);

  const maxAllowedToImport = Math.max(0, 6 - currentPhotoCount);

  if (!isOpen) return null;

  // Handle album inspection
  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setInspectError(null);
    setInspectSuggestion(null);
    setRequiresAuth(false);
    setCandidates([]);
    setSelectedIds([]);
    setPrimaryId(null);
    setImportResults([]);

    try {
      const res = await fetch('/api/album/import/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setInspectError(data.error || 'Nie udało się wczytać albumu.');
        setInspectSuggestion(data.suggestion || null);
        setRequiresAuth(!!data.requiresAuth);
        setProvider(data.provider || 'unsupported');
        return;
      }

      setProvider(data.provider);
      setAlbumTitle(data.albumTitle || 'Album zdjęć');
      setCandidates(data.photos || []);

      // Auto-select first photos up to available quota
      const initialSelected = (data.photos || []).slice(0, maxAllowedToImport).map((p: AlbumImportCandidate) => p.id);
      setSelectedIds(initialSelected);
      if (initialSelected.length > 0) {
        setPrimaryId(initialSelected[0]);
      }
    } catch (err: any) {
      setInspectError(err.message || 'Wystąpił błąd połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection of photo candidate
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      if (primaryId === id) {
        const remaining = selectedIds.filter(i => i !== id);
        setPrimaryId(remaining.length > 0 ? remaining[0] : null);
      }
    } else {
      if (selectedIds.length >= maxAllowedToImport) {
        return; // Limit reached
      }
      setSelectedIds([...selectedIds, id]);
      if (!primaryId) {
        setPrimaryId(id);
      }
    }
  };

  // Execute import of selected photos
  const handleExecuteImport = async () => {
    if (selectedIds.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedIds.length });
    setImportResults([]);

    const photosToImport = candidates
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({ id: c.id, sourceUrl: c.sourceUrl }));

    try {
      const res = await fetch('/api/album/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          photos: photosToImport,
          primaryPhotoId: primaryId || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Importowanie zdjęć nie powiodło się.');
      }

      setImportResults(data.results || []);

      // If at least one photo was imported, notify parent
      if (data.updatedPhotos && data.importedCount > 0) {
        onPhotosImported(data.updatedPhotos);
      }
    } catch (err: any) {
      setInspectError(err.message || 'Błąd podczas importu.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg aura-glass-card rounded-[28px] border border-purple-500/30 bg-[#090b14]/95 p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-600/30 to-purple-600/30 border border-purple-500/40 flex items-center justify-center text-fuchsia-400">
              <Link2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide">Importuj z linku</h3>
              <p className="text-[11px] text-fuchsia-300">Udostępnione albumy iCloud i Google Photos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleInspect} className="space-y-2.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Wklej link do udostępnionego albumu</span>
            <span className="text-[10px] text-fuchsia-400 font-normal">
              Limit galerii: {currentPhotoCount}/6 (wolne: {maxAllowedToImport})
            </span>
          </label>

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://photos.app.goo.gl/... lub https://www.icloud.com/sharedalbum/#..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={loading || isImporting}
              className="flex-1 aura-glass-input rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none border border-white/10 focus:border-purple-500/60 transition"
              required
            />
            <button
              type="submit"
              disabled={loading || isImporting || !urlInput.trim()}
              className="aura-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-950/40 flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wczytuję...</span>
                </>
              ) : (
                <>
                  <span>Wczytaj zdjęcia</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security & Authentication Notice */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-fuchsia-400 mt-0.5" />
          <span>
            <strong>Bezpieczeństwo AURA:</strong> AURA nigdy nie pyta o hasło do Twojego konta Apple ani Google. Importowane zdjęcia są weryfikowane, oczyszczane z danych lokalizacji (EXIF/GPS) i zapisywane w bezpiecznym magazynie AURA.
          </span>
        </div>

        {/* Error or Authentication Required Message */}
        {inspectError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="block text-rose-300 font-bold mb-0.5">
                  {requiresAuth ? 'Dostawca wymaga logowania lub album jest prywatny' : 'Nie udało się wczytać albumu'}
                </strong>
                <span>{inspectError}</span>
              </div>
            </div>

            {inspectSuggestion && (
              <div className="pt-2 border-t border-rose-500/20 text-[11px] text-rose-100 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                <span><strong>Rozwiązanie:</strong> {inspectSuggestion}</span>
              </div>
            )}

            {requiresAuth && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3 text-cyan-400" />
                  <span>Użyj „Prześlij z urządzenia”</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Inspected Photos Selection View */}
        {candidates.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {albumTitle}
                </span>
                <span className="text-[10px] text-slate-400">
                  Wybierz do {maxAllowedToImport} zdjęć (wybrano: {selectedIds.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const toSelect = candidates.slice(0, maxAllowedToImport).map(c => c.id);
                    setSelectedIds(toSelect);
                    if (toSelect.length > 0 && !primaryId) setPrimaryId(toSelect[0]);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-slate-200 font-semibold transition"
                >
                  Zaznacz pierwsze {maxAllowedToImport}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds([]);
                    setPrimaryId(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-slate-400 hover:text-white font-semibold transition"
                >
                  Odznacz
                </button>
              </div>
            </div>

            {/* Candidate Thumbnail Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {candidates.map((cand) => {
                const isSelected = selectedIds.includes(cand.id);
                const isPrimary = primaryId === cand.id;
                const selectOrder = selectedIds.indexOf(cand.id) + 1;

                return (
                  <div
                    key={cand.id}
                    onClick={() => toggleSelect(cand.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all group ${
                      isSelected 
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/40 shadow-lg shadow-purple-950/60' 
                        : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={cand.previewUrl} 
                      alt="Thumbnail" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />

                    {/* Selection Checkmark / Order Badge */}
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isSelected 
                        ? 'bg-fuchsia-600 text-white shadow-md' 
                        : 'bg-black/60 text-transparent border border-white/30 group-hover:border-white'
                    }`}>
                      {isSelected ? selectOrder : ''}
                    </div>

                    {/* Primary Photo Star Toggle */}
                    {isSelected && (
                      <button
                        type="button"
                        title={isPrimary ? "Główne zdjęcie profilu" : "Ustaw jako główne zdjęcie"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryId(cand.id);
                        }}
                        className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 backdrop-blur-md transition ${
                          isPrimary 
                            ? 'bg-amber-500 text-black shadow-md' 
                            : 'bg-black/70 text-slate-300 hover:text-amber-300'
                        }`}
                      >
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{isPrimary ? 'Główne' : 'Ustaw'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Per-photo Import Results if finished */}
            {importResults.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-[#0d0f1b] border border-white/10 text-xs">
                <span className="font-bold text-white block">Status importowania:</span>
                {importResults.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Zdjęcie #{idx + 1}</span>
                    {r.success ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pomyślnie zaimportowano
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {r.error || 'Błąd'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                {selectedIds.length === 0 ? 'Wybierz co najmniej 1 zdjęcie' : `Gotowe do importu: ${selectedIds.length}`}
              </span>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || selectedIds.length === 0}
                className="aura-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-purple-950/60 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zapisuję w AURA...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Dodaj wybrane ({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
