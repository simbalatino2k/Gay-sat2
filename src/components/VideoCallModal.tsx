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
  Info,
  Phone,
  Volume2
} from 'lucide-react';
import { videoEffectsService, APPROVED_EFFECTS, VideoEffect } from '../services/videoEffectsService';
import { MediaPermissionModal } from './MediaPermissionModal';
import { auraWebSocketUrl } from '../lib/websocketEndpoint';

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

export type CallType = 'video' | 'voice';

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
  callType?: CallType;
  onClose: () => void;
}

// Synthesized audio feedback for calling (zero external audio file dependencies)
class CallTonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playRingback() {
    this.stop();
    this.initCtx();

    const beep = () => {
      if (!this.ctx) return;
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.2);
        osc2.stop(this.ctx.currentTime + 1.2);
      } catch {}
    };

    beep();
    this.intervalId = setInterval(beep, 3000);
  }

  public playIncomingRingtone() {
    this.stop();
    this.initCtx();

    const chime = () => {
      if (!this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = this.ctx.currentTime + idx * 0.12;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.05, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(start);
          osc.stop(start + 0.35);
        });
      } catch {}
    };

    chime();
    this.intervalId = setInterval(chime, 2500);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  isIncoming,
  currentUserId,
  targetUser,
  authToken,
  incomingSignalData,
  callType = 'video',
  onClose
}) => {
  const [activeCallType, setActiveCallType] = useState<CallType>(callType);
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'INCOMING_RINGING' : 'OUTGOING_RINGING');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
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
  const tonePlayerRef = useRef<CallTonePlayer | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = useRef<boolean>(false);

  // Synchronize initial callType
  useEffect(() => {
    if (incomingSignalData?.callType) {
      setActiveCallType(incomingSignalData.callType);
      setIsVideoOff(incomingSignalData.callType === 'voice');
    } else {
      setActiveCallType(callType);
      setIsVideoOff(callType === 'voice');
    }
  }, [callType, incomingSignalData]);

  // Audio ringtone / ringback management
  useEffect(() => {
    if (!tonePlayerRef.current) {
      tonePlayerRef.current = new CallTonePlayer();
    }
    const player = tonePlayerRef.current;

    if (isOpen) {
      if (callState === 'OUTGOING_RINGING') {
        player.playRingback();
      } else if (callState === 'INCOMING_RINGING') {
        player.playIncomingRingtone();
      } else {
        player.stop();
      }
    } else {
      player.stop();
    }

    return () => {
      player.stop();
    };
  }, [isOpen, callState]);

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

  // Ensure local video ref binds to stream whenever mounted
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [callState, isVideoOff, localStreamRef.current]);

  // Ensure remote video/audio ref binds to stream and plays reliably
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(e => {
        console.warn('[WebRTC] Odtwarzanie strumienia zdalnego wymaga interakcji użytkownika:', e?.message);
      });
    }
  }, [callState, remoteStreamRef.current]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to drain queued ICE candidates once remote description is set
  const drainIceCandidates = async (pc: RTCPeerConnection) => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const cand = pendingIceCandidatesRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[WebRTC] Błąd dodawania zakolejkowanego kandydata ICE:', e);
        }
      }
    }
  };

  // Fetch ICE servers and TURN credentials
  const fetchIceServers = async (): Promise<RTCIceServer[]> => {
    const fallbackServers: RTCIceServer[] = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:global.stun.twilio.com:3478'
        ]
      }
    ];

    try {
      const res = await fetch('/api/webrtc/ice-servers', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.turnConfigured) {
          setTurnNotice('TURN relay nie jest skonfigurowany. Połączenie działa w trybie bezpośrednim P2P STUN.');
        }
        return data.iceServers && data.iceServers.length > 0 ? data.iceServers : fallbackServers;
      }
    } catch (e) {
      console.warn('[WebRTC] Błąd pobierania serwerów ICE, użycie domyślnych STUN:', e);
    }
    return fallbackServers;
  };

  // Start local media stream (camera & microphone, with fallback to audio-only if needed)
  const startLocalMedia = async (targetFacing = facingMode, audioOnly = isVideoOff): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: audioOnly ? false : {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current && !audioOnly) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.warn('[WebRTC] Błąd inicjalizacji mediów, próba zapasowego audio:', err);
      if (!audioOnly) {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
          });
          localStreamRef.current = audioOnlyStream;
          setIsVideoOff(true);
          return audioOnlyStream;
        } catch {}
      }
      setCallState('PERMISSION_DENIED');
      setErrorMessage('Wymagany jest dostęp do mikrofonu (i opcjonalnie kamery) aby rozmawiać.');
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
        iceCandidatePoolSize: 2,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      pcRef.current = pc;
      hasRemoteDescriptionRef.current = false;

      // Start local media if not already started
      const stream = localStreamRef.current || (await startLocalMedia(facingMode, isVideoOff));

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
        }
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            if (!remoteStreamRef.current?.getTracks().some(t => t.id === track.id)) {
              remoteStreamRef.current?.addTrack(track);
            }
          });
        } else if (event.track) {
          if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
        }

        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current?.play().catch(() => {});
        setCallState('CONNECTED');
      };

      // Handle local ICE candidates
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
        } else if (pc.connectionState === 'failed') {
          if (pc.restartIce) {
            pc.restartIce();
          } else {
            handleEndCall('ENDED');
          }
        } else if (pc.connectionState === 'closed') {
          handleEndCall('ENDED');
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: !isVideoOff
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
      setErrorMessage(err.message || 'Nie udało się nawiązać połączenia.');
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
      hasRemoteDescriptionRef.current = true;
      await drainIceCandidates(pc);

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

  // Establish WebSocket connection for WebRTC signaling
  useEffect(() => {
    if (!isOpen) return;

    const wsUrl = auraWebSocketUrl(window.location);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'AUTH',
        token: authToken
      }));
    };

    ws.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const { type } = data;

        if (type === 'AUTH_SUCCESS') {
          if (!isIncoming && callState === 'OUTGOING_RINGING') {
            ws.send(JSON.stringify({
              type: 'CALL_REQUEST',
              targetUserId: targetUser.id,
              callType: activeCallType
            }));

            // Ringing timeout (35 seconds)
            timeoutTimerRef.current = setTimeout(() => {
              handleEndCall('TIMEOUT');
            }, 35000);
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
          setTimeout(() => handleEndCall('REJECTED'), 2200);
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
            hasRemoteDescriptionRef.current = true;
            await drainIceCandidates(pcRef.current);
            setCallState('CONNECTED');
          }
        }

        if (type === 'ICE_CANDIDATE') {
          if (pcRef.current && hasRemoteDescriptionRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn('[WebRTC] Błąd dodawania kandydata ICE:', err);
            }
          } else {
            pendingIceCandidatesRef.current.push(data.candidate);
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
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          try { ws.close(); } catch {}
        };
      }
    };
  }, [isOpen, authToken]);

  // Accept incoming call
  const handleAcceptCall = async () => {
    try {
      setCallState('CONNECTING');
      await startLocalMedia(facingMode, isVideoOff);
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
      // Handled in startLocalMedia
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
    tonePlayerRef.current?.stop();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CALL_END',
        targetUserId: targetUser.id
      }));
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    videoEffectsService.cleanup();
    setCallState(finalState);
    setTimeout(() => {
      onClose();
    }, 700);
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

  // Toggle Video Camera or upgrade voice to video
  const toggleVideo = async () => {
    if (isVideoOff) {
      // Turn video ON
      try {
        if (!localStreamRef.current?.getVideoTracks().length) {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          const [videoTrack] = videoStream.getVideoTracks();
          if (videoTrack) {
            localStreamRef.current?.addTrack(videoTrack);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
            if (pcRef.current) {
              if (videoSenderRef.current) {
                await videoSenderRef.current.replaceTrack(videoTrack);
              } else {
                videoSenderRef.current = pcRef.current.addTrack(videoTrack, localStreamRef.current!);
              }
            }
          }
        } else {
          localStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = true;
          });
        }
        setIsVideoOff(false);
      } catch (err) {
        console.warn('[WebRTC] Błąd włączania wideo:', err);
      }
    } else {
      // Turn video OFF
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
        setIsVideoOff(true);
      }
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
      const newStream = await startLocalMedia(nextFacing, false);
      const [newVideoTrack] = newStream.getVideoTracks();

      if (videoSenderRef.current && newVideoTrack) {
        if (activeEffect !== 'none') {
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

      if (localVideoRef.current && processedTrack) {
        const previewStream = new MediaStream([processedTrack]);
        localVideoRef.current.srcObject = previewStream;
      }
    } catch (err) {
      console.warn('Błąd aplikacji efektu wideo:', err);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div id="modal-aura-call" className="fixed inset-0 z-[100] bg-[#05060a] flex flex-col justify-between overflow-hidden select-none safe-area-inset">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between bg-gradient-to-b from-[#05060a]/90 via-[#05060a]/50 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-500/40 bg-purple-950/40 shadow-md">
            <img 
              src={targetUser.photoUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'} 
              alt={targetUser.displayName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white leading-tight">{targetUser.displayName}</h4>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activeCallType === 'voice' ? 'Głosowe' : 'Wideo'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-fuchsia-300">
              <span className={`w-2 h-2 rounded-full ${callState === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                {callState === 'CONNECTED' ? formatDuration(callDuration) : 
                 callState === 'CONNECTING' ? 'Nawiązywanie połączenia...' :
                 callState === 'OUTGOING_RINGING' ? 'Dzwonię...' :
                 callState === 'INCOMING_RINGING' ? 'Przychodzące połączenie...' :
                 callState === 'RECONNECTING' ? 'Wznawianie połączenia...' :
                 callState === 'PERMISSION_DENIED' ? 'Brak uprawnień' : 'Połączenie'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {callState === 'CONNECTED' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-semibold shadow-sm">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Szyfrowane P2P
            </span>
          )}
        </div>
      </div>

      {/* Main Call View Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        
        {/* Remote Video & Audio Element (Always mounted so remote audio tracks always play) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover bg-black ${callState === 'CONNECTED' && !isVideoOff && activeCallType === 'video' ? 'block' : 'hidden'}`}
        />

        {/* Audio Mode or Ringing Avatar View */}
        {((callState === 'CONNECTED' && (isVideoOff || activeCallType === 'voice')) || callState !== 'CONNECTED') && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-xs z-10">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-900/40 relative z-10">
                <img 
                  src={targetUser.photoUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'} 
                  alt={targetUser.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Pulsing ring animations */}
              {(callState === 'OUTGOING_RINGING' || callState === 'INCOMING_RINGING') && (
                <div className="absolute -inset-3 rounded-3xl border-2 border-purple-400/50 animate-ping pointer-events-none" />
              )}
              {callState === 'CONNECTED' && (
                <div className="absolute -inset-2 rounded-3xl border border-emerald-400/40 animate-pulse pointer-events-none" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">{targetUser.displayName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {callState === 'OUTGOING_RINGING' ? 'Oczekiwanie na odebranie...' :
                 callState === 'INCOMING_RINGING' ? (activeCallType === 'voice' ? 'Przychodząca rozmowa głosowa' : 'Przychodząca wideorozmowa') :
                 callState === 'CONNECTING' ? 'Inicjalizacja bezpiecznego kanału audio/wideo...' :
                 callState === 'CONNECTED' ? (isVideoOff ? 'Rozmowa głosowa w toku' : 'Połączenie aktywne') :
                 callState === 'BUSY' ? 'Użytkownik prowadzi inną rozmowę.' :
                 callState === 'REJECTED' ? 'Rozmowa odrzucona.' :
                 callState === 'TIMEOUT' ? 'Brak odpowiedzi.' :
                 callState === 'PERMISSION_DENIED' ? errorMessage || 'Wymagane uprawnienia.' :
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
            {activeEffect !== 'none' && !isVideoOff && (
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-purple-500/40 text-[9px] font-bold text-fuchsia-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>AR</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AR Effects Drawer Panel */}
      {showEffects && !isVideoOff && (
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
              id="btn-call-reject"
              onClick={handleRejectCall}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/60 transition group-active:scale-90">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-rose-300">Odrzuć</span>
            </button>

            <button
              id="btn-call-accept"
              onClick={handleAcceptCall}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-950/60 transition group-active:scale-90 animate-pulse">
                {activeCallType === 'voice' ? <Phone className="w-7 h-7" /> : <Video className="w-7 h-7" />}
              </div>
              <span className="text-xs font-bold text-emerald-300">Odbierz</span>
            </button>
          </div>
        ) : (
          /* Active Call Controls */
          <>
            {/* Mute Audio */}
            <button
              id="btn-call-mute"
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
              id="btn-call-video-toggle"
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

            {/* Switch Camera (Front/Rear) - visible if video is active */}
            {!isVideoOff && (
              <button
                id="btn-call-switch-camera"
                onClick={handleSwitchCamera}
                className="p-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white transition active:scale-90"
                title="Przełącz aparat przód / tył"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            {/* AR Effects Button - visible if video is active */}
            {!isVideoOff && (
              <button
                id="btn-call-ar-effects"
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
            )}

            {/* End Call Button */}
            <button
              id="btn-call-hangup"
              onClick={() => handleEndCall('ENDED')}
              className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition active:scale-90"
              title="Zakończ połączenie"
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
            await startLocalMedia(facingMode, isVideoOff);
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
