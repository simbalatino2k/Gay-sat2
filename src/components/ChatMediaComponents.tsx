import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, MessageMediaInfo, LocationInfo, LinkPreviewInfo } from '../types';
import {
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Sticker,
  Mic,
  Star,
  Play,
  Pause,
  X,
  Send,
  Loader2,
  ExternalLink,
  Map,
  AlertCircle,
  ShieldCheck,
  Lock,
  Maximize2
} from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { AURA_STICKERS } from '../data/auraStickers';
import { useScreenshotProtection } from '../hooks/useScreenshotProtection';
import { ScreenshotShield } from './common/ScreenshotShield';

// ----------------------------------------
// Media URL Resolver (handles auth tokens for secure endpoints)
// ----------------------------------------
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/api/media/') && !url.includes('token=')) {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('aura_auth_token') || localStorage.getItem('aura_token'))
        : null;
      if (token) {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(token)}`;
      }
    } catch {
      // Ignore storage read errors
    }
  }
  return url;
}

// ----------------------------------------
// Chat Media Menu
// ----------------------------------------
interface ChatMediaMenuProps {
  onSelectAction: (action: 'PHOTO' | 'LINK' | 'LOCATION' | 'STICKER' | 'VOICE' | 'STAR_VIDEO') => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatMediaMenu: React.FC<ChatMediaMenuProps> = ({ onSelectAction, isOpen, onClose }) => {
  if (!isOpen) return null;

  const actions = [
    { id: 'PHOTO', icon: <ImageIcon className="w-5 h-5" />, label: 'Photo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40' },
    { id: 'LINK', icon: <LinkIcon className="w-5 h-5" />, label: 'Link', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40' },
    { id: 'LOCATION', icon: <MapPin className="w-5 h-5" />, label: 'Location', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40' },
    { id: 'STICKER', icon: <Sticker className="w-5 h-5" />, label: 'Sticker', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40' },
    { id: 'VOICE', icon: <Mic className="w-5 h-5" />, label: 'Voice', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40' },
    { id: 'STAR_VIDEO', icon: <Star className="w-5 h-5" />, label: 'Star Video', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.15)]' },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full mb-3 right-0 z-50 p-2.5 rounded-[20px] bg-[#0c0e18]/95 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-2 fade-in duration-200">
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                onSelectAction(action.id as any);
                onClose();
              }}
              className={`flex flex-col items-center justify-center p-3 w-[72px] h-[72px] rounded-2xl border transition-all duration-200 active:scale-95 group ${action.bg}`}
            >
              <div className={`${action.color} mb-1.5 transition-transform group-hover:scale-110 duration-300`}>
                {action.icon}
              </div>
              <span className="text-[9.5px] font-bold text-slate-300 tracking-wide">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// ----------------------------------------
// Photo Message (Protected against screenshots, drag, right-click saving)
// ----------------------------------------
export const PhotoMessage: React.FC<{ media?: MessageMediaInfo; text?: string; isMe: boolean }> = ({ media, text, isMe }) => {
  const [showFullView, setShowFullView] = useState(false);
  const { isScreenshotAttempted, isWindowBlurred, dismissWarning } = useScreenshotProtection({
    enabled: showFullView,
    featureName: 'Zdjęcie AURA',
    protectOnBlur: true
  });

  if (!media?.url) return null;
  const resolvedUrl = resolveMediaUrl(media.url);

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => setShowFullView(true)}
        onContextMenu={(e) => e.preventDefault()}
        className="overflow-hidden rounded-xl border border-white/10 bg-black/50 cursor-pointer active:opacity-80 transition-opacity protected-media-container select-none relative group"
        title="Kliknij, aby otworzyć chronione zdjęcie"
      >
        <img
          src={resolvedUrl}
          alt="Shared Photo"
          className="w-full max-w-[220px] object-cover max-h-[300px] protected-image select-none pointer-events-none"
          loading="lazy"
          referrerPolicy="no-referrer"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Anti-screenshot mini watermark badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[8.5px] font-mono text-cyan-300 pointer-events-none select-none flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
          <span>AURA SECURE</span>
        </div>
      </div>
      {text && <p className="px-1 select-none">{text}</p>}

      {/* Protected Fullscreen Photo Viewer */}
      {showFullView && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-in fade-in duration-200"
          onContextMenu={(e) => e.preventDefault()}
        >
          <ScreenshotShield
            isBlocked={isScreenshotAttempted}
            isWindowBlurred={isWindowBlurred}
            featureTitle="Chronione Zdjęcie AURA"
            onDismiss={dismissWarning}
            showWatermark={true}
            watermarkText="AURA 18+ NO SCREENSHOT"
          >
            <div className="relative max-w-lg w-full max-h-[85vh] flex flex-col items-center justify-center">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowFullView(false)}
                className="absolute -top-12 right-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90 z-30"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Security Pill */}
              <div className="absolute -top-12 left-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] text-cyan-200 font-semibold z-30">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zrzuty ekranu zablokowane</span>
              </div>

              {/* Full Image Container */}
              <div
                className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/80 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[75vh]"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={resolvedUrl}
                  alt="Full view"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-full object-contain max-h-[75vh] protected-image select-none pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </div>
          </ScreenshotShield>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------
// Link Message
// ----------------------------------------
export const LinkMessage: React.FC<{ preview?: LinkPreviewInfo; text?: string }> = ({ preview, text }) => {
  if (!preview) return <p>{text}</p>;

  return (
    <div className="space-y-1.5 w-[220px]">
      {text && <p className="px-1">{text}</p>}
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all duration-300 active:scale-[0.98] group shadow-sm hover:shadow-lg hover:shadow-black/50"
      >
        {preview.thumbnailUrl && (
          <div className="h-28 w-full bg-slate-900 overflow-hidden relative">
            <img src={preview.thumbnailUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
        <div className="p-2.5 relative">
          <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-fuchsia-300 transition-colors">{preview.title || preview.domain}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[9.5px] text-slate-400 font-medium">
            <ExternalLink className="w-3 h-3 group-hover:text-fuchsia-400 transition-colors" />
            <span>{preview.domain}</span>
          </div>
        </div>
      </a>
    </div>
  );
};

// ----------------------------------------
// Location Message
// ----------------------------------------
export const LocationMessage: React.FC<{ location?: LocationInfo; text?: string }> = ({ location, text }) => {
  if (!location) return null;

  const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=14&size=400x200&maptype=roadmap&markers=color:red%7C${location.lat},${location.lng}&key=YOUR_API_KEY_PLACEHOLDER`; // In a real app we'd use a real key or a map component

  return (
    <div className="space-y-1.5 w-[220px]">
      {text && <p className="px-1">{text}</p>}
      <div className="rounded-xl border border-white/10 hover:border-rose-500/30 bg-black/40 overflow-hidden relative transition-colors duration-300 group shadow-sm hover:shadow-lg hover:shadow-rose-900/10">
        <div className="h-[110px] w-full bg-slate-900 relative overflow-hidden">
          {/* Faux static map for demo purposes without exposing API keys */}
          <div className="absolute inset-0 bg-[#1e2330] opacity-80 group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'radial-gradient(circle at center, #2a3142 0%, #1e2330 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <MapPin className="w-4 h-4 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            </div>
          </div>
        </div>

        <div className="p-2.5 flex items-center justify-between gap-2 relative bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition-colors">
          <div className="flex-1 truncate">
            <p className="text-[11px] font-bold text-slate-200 truncate group-hover:text-rose-100 transition-colors">{location.approximateArea || 'Current Location'}</p>
            {location.distanceKm !== undefined && (
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-rose-300/70 transition-colors">{formatDistance(location.distanceKm)} away</p>
            )}
          </div>

          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all active:scale-95 border border-transparent hover:border-rose-500/30"
            title="Open in Maps"
          >
            <Map className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------
// Sticker Picker
// ----------------------------------------
export const StickerPicker: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (sticker: typeof AURA_STICKERS[0]) => void }> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full mb-3 right-0 z-50 w-[320px] max-h-[380px] p-4 rounded-[24px] bg-[#0c0e18]/95 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-wide">Aura Stickers</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3 pb-2">
            {AURA_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => {
                  onSelect(sticker);
                  onClose();
                }}
                className="relative aspect-square flex items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-200 active:scale-90 group"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300 ease-out"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ----------------------------------------
// Sticker Message
// ----------------------------------------
export const StickerMessage: React.FC<{ stickerId?: string; stickerUrl?: string; stickerName?: string }> = ({ stickerId, stickerUrl, stickerName }) => {
  // Find URL if not explicitly provided, fallback to the local array
  const stickerData = AURA_STICKERS.find(s => s.id === stickerId);
  const finalUrl = stickerUrl || stickerData?.url;

  if (!finalUrl) {
    // Legacy fallback
    const stickerEmojiMap: Record<string, string> = {
      's1': '🔥', 's2': '💅', 's3': '💦', 's4': '🥂', 's5': '👀', 's6': '✨'
    };
    const emoji = stickerEmojiMap[stickerId || 's6'] || '✨';
    return (
      <div className="px-2 py-1 flex items-center justify-center">
        <span className="text-[4rem] leading-none drop-shadow-2xl animate-in zoom-in duration-300 spring-bounce">{emoji}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-1">
      <img
        src={finalUrl}
        alt={stickerName || 'Sticker'}
        className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] animate-in zoom-in-75 duration-500 spring-bounce"
        loading="lazy"
      />
    </div>
  );
};

// ----------------------------------------
// Voice Message
// ----------------------------------------
export const VoiceMessage: React.FC<{ media?: MessageMediaInfo; isMe: boolean }> = ({ media, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (media?.url) {
      const resolved = resolveMediaUrl(media.url);
      audioRef.current = new Audio(resolved);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
      audioRef.current.onerror = () => {
        console.warn('Audio playback notice: source failed to load');
        setIsPlaying(false);
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [media?.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => {
        console.warn("Audio play notice:", e?.message || e);
        setIsPlaying(false);
      });
    }
  };

  const formatDuration = (secs: number = 0) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!media?.url) return null;

  return (
    <div className={`flex items-center gap-3 w-[180px] p-1`}>
      <button
        onClick={togglePlay}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'}`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1.5">
        <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden relative">
          <div
            className={`absolute left-0 top-0 bottom-0 transition-all ease-linear ${isMe ? 'bg-white' : 'bg-indigo-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`text-[9px] font-bold ${isMe ? 'text-white/80' : 'text-slate-400'}`}>
          {formatDuration(media.durationSeconds || 0)}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------
// Star Video Message (AURA Signature)
// ----------------------------------------
export const StarVideoMessage: React.FC<{ media?: MessageMediaInfo }> = ({ media }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const rawUrl = media?.url;
  const resolvedUrl = useMemo(() => resolveMediaUrl(rawUrl), [rawUrl]);

  // Reset states when the URL changes
  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setIsBuffering(false);
    setIsReady(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [resolvedUrl]);

  if (!rawUrl) return null;

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (hasError) {
      // If previously had error, retry loading
      setHasError(false);
      video.load();
      return;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      try {
        setIsBuffering(true);
        if (video.readyState === 0) {
          video.load();
        }
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
        setHasError(false);
      } catch (err: any) {
        console.warn("Video playback notice:", err?.message || err);
        setIsPlaying(false);
        // If browser autoplay policy blocked unmuted playback, try muted
        if (err?.name === 'NotAllowedError') {
          try {
            video.muted = true;
            await video.play();
            setIsPlaying(true);
            return;
          } catch {
            // Muted playback also failed
          }
        }
        // If element has no supported sources or network error occurred
        if (err?.name === 'NotSupportedError' || video.error) {
          setHasError(true);
        }
      } finally {
        setIsBuffering(false);
      }
    }
  };

  return (
    <div className="relative w-[160px] h-[160px] mx-auto animate-in zoom-in-95 duration-400 select-none">
      {/* Glow effect with pulse */}
      <div
        className="absolute inset-[-4px] bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 rounded-full blur-[10px] opacity-50 mix-blend-screen animate-pulse pointer-events-none"
        style={{ animationDuration: '3s' }}
      />

      {/* The Star Clip Path Container */}
      <div
        className="relative w-full h-full bg-[#0a0c16] overflow-hidden cursor-pointer group flex items-center justify-center transition-all duration-300"
        style={{
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        }}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={resolvedUrl}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
          loop
          playsInline
          poster={media.thumbnailUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedData={() => {
            setIsReady(true);
            setHasError(false);
          }}
          onCanPlay={() => {
            setIsReady(true);
            setHasError(false);
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onError={() => {
            console.warn("Video failed to load source:", resolvedUrl);
            setHasError(true);
            setIsPlaying(false);
            setIsBuffering(false);
          }}
        >
          {resolvedUrl && (
            <source
              src={resolvedUrl}
              type={media.mimeType || (resolvedUrl.includes('.webm') ? 'video/webm' : 'video/mp4')}
            />
          )}
        </video>

        {/* State Overlays */}
        {hasError ? (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-3 text-center z-10 pointer-events-none">
            <AlertCircle className="w-5 h-5 text-fuchsia-400 mb-1" />
            <span className="text-[10px] font-bold text-slate-200">Wideo niedostępne</span>
            <span className="text-[8px] text-slate-400 mt-0.5">Dotknij, aby ponowić</span>
          </div>
        ) : isBuffering ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="w-7 h-7 text-fuchsia-400 animate-spin" />
          </div>
        ) : (
          /* Play overlay / Luminous edge simulation */
          <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100 group-hover:bg-black/40'}`}>
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-xl shadow-fuchsia-900/20 group-hover:scale-110 transition-transform duration-300">
              <Play className="w-5 h-5 fill-current ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------
// Unified Preview/Composer Component
// ----------------------------------------
interface MediaPreviewProps {
  type: string;
  data: any;
  onCancel: () => void;
  onSend: (data: any) => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ type, data, onCancel, onSend }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateUpload = () => {
    setLoading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setLoading(false);
          onSend(data);
          return 100;
        }
        return p + 15;
      });
    }, 150);
  };

  useEffect(() => {
    // If it's a sticker or location, don't simulate long upload, just send directly
    if (type === 'STICKER' || type === 'LOCATION' || type === 'LINK') {
      onSend(data);
    }
  }, []);

  if (type === 'STICKER' || type === 'LOCATION' || type === 'LINK') return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0c0e18]/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-sm px-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-white tracking-wide">
            {type === 'PHOTO' ? 'Send Photo' : type === 'VOICE' ? 'Voice Message' : 'Star Video'}
          </h3>
          <button onClick={onCancel} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 flex flex-col items-center justify-center min-h-[300px] mb-8 relative overflow-hidden shadow-2xl">
          {type === 'PHOTO' && data.url && (
            <img src={data.url} alt="Preview" className="max-w-full max-h-[250px] rounded-xl object-contain shadow-lg" />
          )}

          {type === 'STAR_VIDEO' && data.url && (
            <div className="scale-125">
              <StarVideoMessage media={{ url: data.url }} />
            </div>
          )}

          {type === 'VOICE' && (
            <div className="w-full">
              <div className="h-24 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center space-y-3">
                <Mic className="w-8 h-8 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold text-indigo-300">Recording ready</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-[#0c0e18]/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
              <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-150 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{progress}% Uploaded</p>
            </div>
          )}
        </div>

        <button
          onClick={simulateUpload}
          disabled={loading}
          className="w-full aura-btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <span>Sending...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
