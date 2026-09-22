import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  SwitchCamera, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  X, 
  Maximize2, 
  Minimize2,
  Info
} from 'lucide-react';
import { videoEffectsService, APPROVED_EFFECTS, VideoEffect } from '../services/videoEffectsService';
import { MediaPermissionModal } from './MediaPermissionModal';

export type CallState = 
  | 'IDLE'
  | 'OUTGOING_RINGING'
  | 'INCOMING_RINGING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ENDED'
  | 'REJECTED'
  | 'BUSY'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED';

interface VideoCallModalProps {
  isOpen: boolean;
  isIncoming: boolean;
  currentUserId: string;
  targetUser: {
    id: string;
    displayName: string;
    photoUrl?: string;
    role?: string;
  };
  authToken: string;
  incomingSignalData?: any;
  onClose: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  isIncoming,
  currentUserId,
  targetUser,
  authToken,
  incomingSignalData,
  onClose
}) => {
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'INCOMING_RINGING' : 'OUTGOING_RINGING');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [showEffects, setShowEffects] = useState(false);
  const [activeEffect, setActiveEffect] = useState('none');
  const [turnNotice, setTurnNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const timeoutTimerRef = useRef<any>(null);

  // Timer for connected call duration
  useEffect(() => {
    let interval: any;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to establish WebSocket connection for WebRTC signaling
  useEffect(() => {
    if (!isOpen) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/webrtc`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate with server
      ws.send(JSON.stringify({
        type: 'AUTH',
        token: authToken
      }));
    };

    ws.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const { type, senderId } = data;

        if (type === 'AUTH_SUCCESS') {
          // If outgoing call, initiate CALL_REQUEST
          if (!isIncoming && callState === 'OUTGOING_RINGING') {
            ws.send(JSON.stringify({
              type: 'CALL_REQUEST',
              targetUserId: targetUser.id
            }));

            // Ringing timeout (30 seconds)
            timeoutTimerRef.current = setTimeout(() => {
              handleEndCall('TIMEOUT');
            }, 30000);
          }
        }

        if (type === 'CALL_ACCEPTED') {
          clearTimeout(timeoutTimerRef.current);
          setCallState('CONNECTING');
          await initializePeerConnection(true);
        }

        if (type === 'CALL_REJECTED') {
          clearTimeout(timeoutTimerRef.current);
          setCallState(data.reason === 'BUSY' ? 'BUSY' : 'REJECTED');
          setTimeout(() => handleEndCall('REJECTED'), 2500);
        }

        if (type === 'CALL_TERMINATED' || type === 'CALL_END') {
          handleEndCall('ENDED');
        }

        if (type === 'OFFER') {
          await handleRemoteOffer(data.sdp);
        }

        if (type === 'ANSWER') {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            setCallState('CONNECTED');
          }
        }

        if (type === 'ICE_CANDIDATE') {
          if (pcRef.current && data.candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.error('[WebRTC Signal] Błąd przetwarzania sygnału:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[WebRTC Signal] Błąd połączenia WebSocket:', err);
    };

    ws.onclose = () => {
      if (callState === 'CONNECTED') {
        setCallState('RECONNECTING');
      }
    };

    return () => {
      clearTimeout(timeoutTimerRef.current);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isOpen, authToken]);

  // Fetch ICE servers and TURN credentials
  const fetchIceServers = async (): Promise<RTCIceServer[]> => {
    try {
      const res = await fetch('/api/webrtc/ice-servers', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!data.turnConfigured) {
        setTurnNotice('TURN relay nie jest skonfigurowany. Połączenie działa w trybie bezpośrednim P2P STUN.');
      }
      return data.iceServers || [{ urls: ['stun:stun.l.google.com:19302'] }];
    } catch (e) {
      return [{ urls: ['stun:stun.l.google.com:19302'] }];
    }
  };

  // Start local media stream (camera & microphone)
  const startLocalMedia = async (targetFacing = facingMode): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error('[WebRTC] Brak uprawnień do kamery/mikrofonu:', err);
      setCallState('PERMISSION_DENIED');
      setErrorMessage('Aplikacja nie uzyskała dostępu do kamery lub mikrofonu.');
      setShowPermissionModal(true);
      throw err;
    }
  };

  // Initialize WebRTC RTCPeerConnection
  const initializePeerConnection = async (isInitiator: boolean) => {
    try {
      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 2
      });
      pcRef.current = pc;

      // Start local media if not already started
      const stream = localStreamRef.current || (await startLocalMedia());

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === 'video') {
          videoSenderRef.current = sender;
        }
      });

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
        }
        event.streams[0].getTracks().forEach(track => {
          remoteStreamRef.current?.addTrack(track);
        });
        setCallState('CONNECTED');
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            targetUserId: targetUser.id,
            candidate: event.candidate
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('CONNECTED');
        } else if (pc.connectionState === 'disconnected') {
          setCallState('RECONNECTING');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          handleEndCall('ENDED');
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'OFFER',
            targetUserId: targetUser.id,
            sdp: offer
          }));
        }
      }
    } catch (err: any) {
      console.error('[WebRTC] Błąd inicjalizacji połączenia:', err);
      setErrorMessage(err.message || 'Nie udało się nawiązać wideorozmowy.');
    }
  };

  // Handle incoming remote offer
  const handleRemoteOffer = async (remoteSdp: any) => {
    try {
      if (!pcRef.current) {
        await initializePeerConnection(false);
      }
      const pc = pcRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ANSWER',
          targetUserId: targetUser.id,
          sdp: answer
        }));
      }
      setCallState('CONNECTED');
    } catch (err) {
      console.error('[WebRTC] Błąd obsługi oferty zdalnej:', err);
    }
  };

  // Accept incoming call (prompts for camera/mic permissions only now)
  const handleAcceptCall = async () => {
    try {
      setCallState('CONNECTING');
      await startLocalMedia();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CALL_ACCEPTED',
          targetUserId: targetUser.id
        }));
      }
      if (incomingSignalData?.sdp) {
        await handleRemoteOffer(incomingSignalData.sdp);
      }
    } catch (e) {
      // Permission denied handled in startLocalMedia
    }
  };

  // Reject incoming call
  const handleRejectCall = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CALL_REJECTED',
        targetUserId: targetUser.id,
        reason: 'USER_BUSY'
      }));
    }
    handleEndCall('REJECTED');
  };

  // End or close call
  const handleEndCall = (finalState: CallState = 'ENDED') => {
    clearTimeout(timeoutTimerRef.current);

    // Notify other participant
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CALL_END',
        targetUserId: targetUser.id
      }));
    }

    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    // Close WebRTC PeerConnection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Clean up effects
    videoEffectsService.cleanup();

    setCallState(finalState);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Switch camera facing mode (front/rear)
  const handleSwitchCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());
    }

    try {
      const newStream = await startLocalMedia(nextFacing);
      const [newVideoTrack] = newStream.getVideoTracks();

      if (videoSenderRef.current && newVideoTrack) {
        if (activeEffect !== 'none') {
          // Re-apply effect with new track
          await videoEffectsService.applyEffect(activeEffect, newStream, videoSenderRef.current);
        } else {
          await videoSenderRef.current.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.warn('Błąd przełączenia kamery:', err);
    }
  };

  // Apply selected AR effect
  const handleSelectEffect = async (effect: VideoEffect) => {
    setActiveEffect(effect.id);
    if (!localStreamRef.current) return;

    try {
      const processedTrack = await videoEffectsService.applyEffect(
        effect.id,
        localStreamRef.current,
        videoSenderRef.current
      );

      // Also update local preview to show the effect
      if (localVideoRef.current && processedTrack) {
        const previewStream = new MediaStream([processedTrack]);
        localVideoRef.current.srcObject = previewStream;
      }
    } catch (err) {
      console.warn('Błąd aplikacji efektu wideo:', err);
      // Fallback to normal video
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#05060a] flex flex-col justify-between overflow-hidden select-none safe-area-inset">
      
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between bg-gradient-to-b from-[#05060a]/90 via-[#05060a]/50 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/40 bg-purple-950/40">
            <img 
              src={targetUser.photoUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'} 
              alt={targetUser.displayName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">{targetUser.displayName}</h4>
            <div className="flex items-center gap-1.5 text-[11px] text-fuchsia-300">
              <span className={`w-2 h-2 rounded-full ${callState === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                {callState === 'CONNECTED' ? formatDuration(callDuration) : 
                 callState === 'CONNECTING' ? 'Nawiązywanie połączenia...' :
                 callState === 'OUTGOING_RINGING' ? 'Dzwonię...' :
                 callState === 'INCOMING_RINGING' ? 'Przychodząca rozmowa...' :
                 callState === 'RECONNECTING' ? 'Wznawianie połączenia...' :
                 callState === 'PERMISSION_DENIED' ? 'Brak uprawnień' : 'Połączenie'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {callState === 'CONNECTED' && (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-semibold">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Szyfrowane P2P
            </span>
          )}
        </div>
      </div>

      {/* Main Video View Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        
        {/* Remote Video (Fullscreen / Large) */}
        {callState === 'CONNECTED' || callState === 'RECONNECTING' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          /* Calling / Ringing Placeholder */
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-xs">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-900/40">
                <img 
                  src={targetUser.photoUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'} 
                  alt={targetUser.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>
              {callState === 'OUTGOING_RINGING' && (
                <div className="absolute -inset-2 rounded-3xl border border-purple-400/40 animate-ping pointer-events-none" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">{targetUser.displayName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {callState === 'OUTGOING_RINGING' ? 'Oczekiwanie na odebranie przez rozmówcę...' :
                 callState === 'INCOMING_RINGING' ? 'Zaproszenie do prywatnej wideorozmowy AURA' :
                 callState === 'CONNECTING' ? 'Inicjalizacja bezpiecznego kanału audio/wideo...' :
                 callState === 'BUSY' ? 'Użytkownik prowadzi inną rozmowę.' :
                 callState === 'REJECTED' ? 'Rozmowa odrzucona.' :
                 callState === 'TIMEOUT' ? 'Brak odpowiedzi.' :
                 callState === 'PERMISSION_DENIED' ? errorMessage || 'Wymagane uprawnienia do kamery i mikrofonu.' :
                 'Łączenie...'}
              </p>

              {callState === 'PERMISSION_DENIED' && (
                <button
                  id="btn-videocall-fix-permissions"
                  type="button"
                  onClick={() => setShowPermissionModal(true)}
                  className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-lg shadow-purple-900/50 transition active:scale-95"
                >
                  Zezwól na dostęp / Sprawdź uprawnienia
                </button>
              )}
            </div>

            {turnNotice && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 text-left">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>{turnNotice}</span>
              </div>
            )}
          </div>
        )}

        {/* Local Video Picture-in-Picture (PiP) */}
        {(callState === 'CONNECTED' || callState === 'CONNECTING') && (
          <div className="absolute top-4 right-4 z-20 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border border-purple-500/40 shadow-2xl bg-black/80 backdrop-blur-md">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-400 bg-[#090b14]">
                <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-[10px] font-medium">Kamera wył.</span>
              </div>
            )}
            {activeEffect !== 'none' && (
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-purple-500/40 text-[9px] font-bold text-fuchsia-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>AR</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AR Effects Drawer Panel */}
      {showEffects && (
        <div className="relative z-30 px-4 py-3 bg-[#0d0f1b]/95 border-t border-purple-500/20 backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Efekty AR i Aparatu</span>
            </div>
            <button 
              onClick={() => setShowEffects(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 pb-1">
            {APPROVED_EFFECTS.map((eff) => {
              const isActive = activeEffect === eff.id;
              return (
                <button
                  key={eff.id}
                  onClick={() => handleSelectEffect(eff)}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                    isActive 
                      ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white shadow-md shadow-purple-950/50 scale-105' 
                      : 'border-white/10 hover:border-white/20 bg-white/[0.03] text-slate-300'
                  }`}
                >
                  <div 
                    className="w-7 h-7 rounded-lg mb-1 flex items-center justify-center border border-white/20"
                    style={{ backgroundColor: eff.previewColor || '#3b82f6' }}
                  >
                    {eff.id === 'none' ? <X className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-[10px] font-medium leading-tight truncate w-full">{eff.name}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 text-center mt-1">
            Efekty nakładane są bezpośrednio na strumień wideo i są widoczne dla rozmówcy w czasie rzeczywistym.
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="relative z-20 px-4 py-6 bg-gradient-to-t from-[#05060a] via-[#05060a]/90 to-transparent flex items-center justify-center gap-3 sm:gap-5">
        
        {/* If incoming call and waiting for response: Show Odbierz / Odrzuć */}
        {callState === 'INCOMING_RINGING' ? (
          <div className="flex items-center gap-6 w-full max-w-xs justify-around">
            <button
              onClick={handleRejectCall}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/60 transition group-active:scale-90">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-rose-300">Odrzuć</span>
            </button>

            <button
              onClick={handleAcceptCall}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-950/60 transition group-active:scale-90 animate-pulse">
                <Video className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-emerald-300">Odbierz</span>
            </button>
          </div>
        ) : (
          /* Active Call Controls */
          <>
            {/* Mute Audio */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full border transition active:scale-90 ${
                isMuted 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                  : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-white'
              }`}
              title={isMuted ? 'Wyłącz wyciszenie' : 'Wycisz mikrofon'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Camera Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-full border transition active:scale-90 ${
                isVideoOff 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                  : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-white'
              }`}
              title={isVideoOff ? 'Włącz kamerę' : 'Wyłącz kamerę'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Switch Camera (Front/Rear) */}
            <button
              onClick={handleSwitchCamera}
              className="p-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition active:scale-90"
              title="Przełącz aparat przód / tył"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* AR Effects Button */}
            <button
              onClick={() => setShowEffects(!showEffects)}
              className={`p-3.5 rounded-full border transition active:scale-90 ${
                showEffects || activeEffect !== 'none'
                  ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                  : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-white'
              }`}
              title="Efekty AR i aparatu"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            {/* End Call Button */}
            <button
              onClick={() => handleEndCall('ENDED')}
              className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition active:scale-90"
              title="Zakończ rozmowę"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Permissions missing or denied modal */}
      <MediaPermissionModal
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          if (callState === 'PERMISSION_DENIED') {
            handleEndCall('ENDED');
          }
        }}
        onGranted={async () => {
          setShowPermissionModal(false);
          setErrorMessage(null);
          setCallState(isIncoming ? 'CONNECTING' : 'OUTGOING_RINGING');
          try {
            await startLocalMedia();
            await initializePeerConnection(!isIncoming);
          } catch (e) {
            console.error('[WebRTC] Błąd ponownej inicjalizacji mediów:', e);
          }
        }}
        callTargetName={targetUser.displayName}
      />

    </div>
  );
};
