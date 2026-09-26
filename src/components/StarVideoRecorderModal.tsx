import React, { useState, useEffect, useRef } from 'react';
import {
  X, Camera, RotateCcw, Send, AlertCircle, FlipHorizontal, Star, Loader2, Play, Pause, ShieldAlert
} from 'lucide-react';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import { MediaPermissionModal } from './MediaPermissionModal';

interface StarVideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (mediaData: { url: string; durationSeconds: number; mediaId?: string }) => void;
  authToken?: string | null;
  targetUserName?: string;
}

export const StarVideoRecorderModal: React.FC<StarVideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onSend,
  authToken,
  targetUserName = 'rozmówcy'
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const { camera, microphone, checkPermissions } = useMediaPermissions();
  const MAX_RECORDING_SECONDS = 15;

  // Cleanup helper to stop all camera/mic tracks
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setStream(null);
    }
  };

  // Start live camera stream
  const startCamera = async (facing: 'user' | 'environment') => {
    setErrorMsg(null);
    // Stop any existing stream first
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    try {
      // First try with both video and audio
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 640 }
          },
          audio: true
        });
      } catch (errWithAudio) {
        // Fallback to video only if mic is blocked/denied
        console.warn('Microphone failed or denied, trying video only:', errWithAudio);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 640 }
          }
        });
      }

      setStream(mediaStream);
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = mediaStream;
        videoLiveRef.current.play().catch(e => console.warn('Live video play error:', e));
      }
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Brak dostępu do kamery. Nadaj uprawnienia w przeglądarce, aby nagrać Star Video.');
        setShowPermissionPrompt(true);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Nie wykryto kamery na Twoim urządzeniu.');
      } else {
        setErrorMsg('Nie udało się uruchomić kamery: ' + (err.message || 'Błąd urządzenia'));
      }
    }
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecordedBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      startCamera(cameraFacing);
    } else {
      stopCameraStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }

    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen]);

  // Handle camera flip (front / back)
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    await startCamera(nextFacing);
  };

  // Start recording
  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    setErrorMsg(null);

    try {
      // Determine supported mime type
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4'
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = selectedMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        setRecordedBlob(blob);
        const objUrl = URL.createObjectURL(blob);
        setPreviewUrl(objUrl);
        setIsPlayingPreview(true);
      };

      recorder.start(250); // Collect data chunks every 250ms
      setIsRecording(true);

      // Start timer
      let secs = 0;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        secs += 1;
        setRecordingSeconds(secs);
        if (secs >= MAX_RECORDING_SECONDS) {
          handleStopRecording();
        }
      }, 1000);
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
      setErrorMsg('Twoja przeglądarka nie obsługuje nagrywania wideo.');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }
    setIsRecording(false);
  };

  // Retake video
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRecordedBlob(null);
    setRecordingSeconds(0);
    startCamera(cameraFacing);
  };

  // Toggle review video play/pause
  const togglePreviewPlayback = () => {
    if (!videoPreviewRef.current) return;
    if (isPlayingPreview) {
      videoPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      videoPreviewRef.current.play()
        .then(() => {
          setIsPlayingPreview(true);
        })
        .catch(err => {
          console.warn('Preview video play notice:', err?.message || err);
          setIsPlayingPreview(false);
        });
    }
  };

  // Upload & Send Star Video
  const handleConfirmSend = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const finalDuration = Math.max(1, recordingSeconds);
      let mediaId: string | undefined;
      let finalUrl = previewUrl || '';

      // Upload to server if authToken is available
      if (authToken) {
        const formData = new FormData();
        const extension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('media', recordedBlob, `star_video_${Date.now()}.${extension}`);
        formData.append('category', 'star_video');
        formData.append('duration', String(finalDuration));

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.media?.url) {
            finalUrl = data.media.url;
            mediaId = data.media.mediaId;
          }
        } else {
          console.warn('Media upload endpoint returned error, falling back to client blob URL');
        }
      }

      // Stop camera tracks before closing
      stopCameraStream();
      onSend({
        url: finalUrl,
        durationSeconds: finalDuration,
        mediaId
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to send star video:', err);
      // Even if upload failed, send previewUrl so message isn't lost
      stopCameraStream();
      onSend({
        url: previewUrl || '',
        durationSeconds: Math.max(1, recordingSeconds)
      });
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="star-video-recorder-modal"
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-500 p-0.5 shadow-lg shadow-fuchsia-900/40">
            <div className="w-full h-full bg-[#0a0c16] rounded-[10px] flex items-center justify-center text-fuchsia-400">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
              <span>Star Video Short</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/30">
                AURA
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-400">
              Wideo short do {targetUserName} (maks. 15s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!previewUrl && stream && (
            <button
              id="btn-flip-camera"
              type="button"
              onClick={toggleCameraFacing}
              disabled={isRecording}
              className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition disabled:opacity-40"
              title="Przełącz kamerę (przód/tył)"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-close-star-video"
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2.5 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 active:scale-95 transition"
            title="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewfinder / Star Frame */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center my-auto relative">
        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 w-full p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button
              onClick={() => startCamera(cameraFacing)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-[11px] font-bold text-white transition shrink-0"
            >
              Ponów
            </button>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {!previewUrl ? (
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
            {/* Glowing neon background aura */}
            <div
              className={`absolute inset-[-6px] rounded-full blur-[24px] transition-all duration-500 ${
                isRecording
                  ? 'bg-gradient-to-tr from-rose-600 via-fuchsia-600 to-amber-500 opacity-80 animate-pulse'
                  : 'bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 opacity-40'
              }`}
            />

            {/* Star Mask Container */}
            <div
              className="relative w-full h-full bg-[#0d0f1c] overflow-hidden flex items-center justify-center shadow-2xl border border-white/10"
              style={{
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              }}
            >
              <video
                ref={videoLiveRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  cameraFacing === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {!stream && !errorMsg && (
                <div className="absolute inset-0 bg-[#0d0f1c]/90 flex flex-col items-center justify-center text-center p-4 space-y-2">
                  <Camera className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">Uruchamianie kamery...</p>
                </div>
              )}
            </div>

            {/* Recording badge */}
            {isRecording && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white font-black text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse z-30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
              </div>
            )}
          </div>
        ) : (
          /* Recorded Video Preview State */
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center animate-in zoom-in-95 duration-300">
            {/* Glowing aura */}
            <div className="absolute inset-[-6px] rounded-full blur-[24px] bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-purple-600 opacity-60" />

            <div
              className="relative w-full h-full bg-[#0d0f1c] overflow-hidden flex items-center justify-center shadow-2xl cursor-pointer group"
              style={{
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              }}
              onClick={togglePreviewPlayback}
            >
              <video
                ref={videoPreviewRef}
                src={previewUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onError={() => {
                  console.warn('Preview video failed to load source');
                  setIsPlayingPreview(false);
                }}
              />

              <div
                className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200 ${
                  isPlayingPreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                  {isPlayingPreview ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tip text */}
        <p className="mt-4 text-[11px] text-slate-400 text-center max-w-xs">
          {!previewUrl
            ? isRecording
              ? `Nagrywanie... Maksymalnie ${MAX_RECORDING_SECONDS} sekund. Kliknij stop, aby zakończyć.`
              : 'Naciśnij przycisk poniżej, aby rozpocząć nagranie wideo w kształcie gwiazdy AURA.'
            : 'Oto podgląd Twojego Star Video. Sprawdź nagranie przed wysłaniem!'}
        </p>
      </div>

      {/* Footer Controls */}
      <div className="w-full max-w-md pb-4 pt-2 z-20">
        {!previewUrl ? (
          <div className="flex items-center justify-center">
            {!isRecording ? (
              <button
                id="btn-start-record-star-video"
                type="button"
                disabled={!stream || isRecording}
                onClick={handleStartRecording}
                className="group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 disabled:opacity-40 active:scale-95 cursor-pointer"
                title="Rozpocznij nagrywanie"
              >
                {/* Outer animated ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-fuchsia-500 to-pink-500 p-1 shadow-[0_0_25px_rgba(217,70,239,0.5)] group-hover:shadow-[0_0_35px_rgba(217,70,239,0.8)] transition-all">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-white/40" />
                </div>
                {/* Inner button */}
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-fuchsia-600 flex items-center justify-center text-white shadow-inner">
                  <Star className="w-7 h-7 fill-white drop-shadow" />
                </div>
              </button>
            ) : (
              <button
                id="btn-stop-record-star-video"
                type="button"
                onClick={handleStopRecording}
                className="relative flex items-center justify-center w-20 h-20 rounded-full active:scale-95 cursor-pointer"
                title="Zatrzymaj nagrywanie"
              >
                {/* Outer red pulsing ring */}
                <div className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-60" />
                <div className="absolute inset-0 rounded-full bg-rose-600/30 border-2 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.6)]" />
                {/* Inner stop square */}
                <div className="relative w-7 h-7 rounded-lg bg-white shadow-lg" />
              </button>
            )}
          </div>
        ) : (
          /* Preview Action Buttons */
          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-retake-star-video"
              type="button"
              disabled={isUploading}
              onClick={handleRetake}
              className="py-3 px-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Nagraj ponownie</span>
            </button>

            <button
              id="btn-confirm-send-star-video"
              type="button"
              disabled={isUploading}
              onClick={handleConfirmSend}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-fuchsia-950/50 hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wysyłanie...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Wyślij Star Video ✨</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Permission modal integration */}
      <MediaPermissionModal
        isOpen={showPermissionPrompt}
        onClose={() => setShowPermissionPrompt(false)}
        onGranted={() => {
          setShowPermissionPrompt(false);
          startCamera(cameraFacing);
        }}
        callTargetName="Star Video"
      />
    </div>
  );
};
