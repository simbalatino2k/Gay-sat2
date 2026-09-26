import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UseMediaPermissionsReturn {
  camera: PermissionState;
  microphone: PermissionState;
  isChecking: boolean;
  isRequesting: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasAllPermissions: boolean;
  missingPermissions: ('camera' | 'microphone')[];
  error: string | null;
  isSupported: boolean;
  checkPermissions: () => Promise<{ camera: PermissionState; microphone: PermissionState }>;
  requestPermissions: (types?: ('camera' | 'microphone')[]) => Promise<{
    cameraGranted: boolean;
    microphoneGranted: boolean;
    error?: string;
  }>;
  requestCamera: () => Promise<boolean>;
  requestMicrophone: () => Promise<boolean>;
  resetError: () => void;
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [camera, setCamera] = useState<PermissionState>('prompt');
  const [microphone, setMicrophone] = useState<PermissionState>('prompt');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const cameraStatusRef = useRef<PermissionStatus | null>(null);
  const micStatusRef = useRef<PermissionStatus | null>(null);

  const isSupported = typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  /**
   * Safe check for permission state using navigator.permissions.query if supported,
   * falling back to enumerateDevices label inspection.
   */
  const checkPermissions = useCallback(async (): Promise<{ camera: PermissionState; microphone: PermissionState }> => {
    if (!isSupported) {
      if (isMountedRef.current) {
        setCamera('unsupported');
        setMicrophone('unsupported');
      }
      return { camera: 'unsupported', microphone: 'unsupported' };
    }

    setIsChecking(true);

    let nextCamera: PermissionState = 'prompt';
    let nextMic: PermissionState = 'prompt';

    // 1. Try modern Permissions API query
    if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
      try {
        const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        cameraStatusRef.current = camStatus;
        nextCamera = (camStatus.state as PermissionState) || 'prompt';

        camStatus.onchange = () => {
          if (isMountedRef.current) {
            setCamera((camStatus.state as PermissionState) || 'prompt');
          }
        };
      } catch {
        // Fallback for browsers like Safari or older Firefox where { name: 'camera' } is not supported
      }

      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        micStatusRef.current = micStatus;
        nextMic = (micStatus.state as PermissionState) || 'prompt';

        micStatus.onchange = () => {
          if (isMountedRef.current) {
            setMicrophone((micStatus.state as PermissionState) || 'prompt');
          }
        };
      } catch {
        // Fallback for browsers without 'microphone' query support
      }
    }

    // 2. Secondary heuristic: inspect device labels via enumerateDevices
    // If device labels are non-empty, permissions have already been granted in this session
    if (nextCamera === 'prompt' || nextMic === 'prompt') {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasLabeledVideo = devices.some((d) => d.kind === 'videoinput' && d.label.length > 0);
          const hasLabeledAudio = devices.some((d) => d.kind === 'audioinput' && d.label.length > 0);

          if (hasLabeledVideo && nextCamera === 'prompt') {
            nextCamera = 'granted';
          }
          if (hasLabeledAudio && nextMic === 'prompt') {
            nextMic = 'granted';
          }
        }
      } catch {
        // enumerateDevices unavailable or blocked
      }
    }

    if (isMountedRef.current) {
      setCamera(nextCamera);
      setMicrophone(nextMic);
      setIsChecking(false);
    }

    return { camera: nextCamera, microphone: nextMic };
  }, [isSupported]);

  /**
   * Request camera and/or microphone access from the user.
   */
  const requestPermissions = useCallback(
    async (types: ('camera' | 'microphone')[] = ['camera', 'microphone']): Promise<{
      cameraGranted: boolean;
      microphoneGranted: boolean;
      error?: string;
    }> => {
      if (!isSupported) {
        const msg = 'Twoja przeglądarka lub urządzenie nie obsługuje urządzeń multimedialnych (getUserMedia).';
        setError(msg);
        return { cameraGranted: false, microphoneGranted: false, error: msg };
      }

      setIsRequesting(true);
      setError(null);

      const wantCamera = types.includes('camera');
      const wantMic = types.includes('microphone');

      let cameraGranted = camera === 'granted';
      let microphoneGranted = microphone === 'granted';
      let capturedError: string | undefined;

      // 1. If both are desired and not yet granted, attempt unified prompt first
      if (wantCamera && wantMic && (!cameraGranted || !microphoneGranted)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {
              // Ignore track stop errors
            }
          });
          cameraGranted = true;
          microphoneGranted = true;
          if (isMountedRef.current) {
            setCamera('granted');
            setMicrophone('granted');
          }
        } catch (err: any) {
          console.warn('[useMediaPermissions] Combined request failed, trying individually:', err?.message || err);

          // Test camera individually
          try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            vStream.getTracks().forEach((t) => t.stop());
            cameraGranted = true;
            if (isMountedRef.current) setCamera('granted');
          } catch (camErr: any) {
            cameraGranted = false;
            if (isMountedRef.current) {
              setCamera(camErr.name === 'NotAllowedError' ? 'denied' : 'prompt');
            }
          }

          // Test microphone individually
          try {
            const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            aStream.getTracks().forEach((t) => t.stop());
            microphoneGranted = true;
            if (isMountedRef.current) setMicrophone('granted');
          } catch (micErr: any) {
            microphoneGranted = false;
            if (isMountedRef.current) {
              setMicrophone(micErr.name === 'NotAllowedError' ? 'denied' : 'prompt');
            }
          }

          if (err.name === 'NotAllowedError') {
            capturedError = 'Dostęp do urządzeń multimedialnych został odrzucony w przeglądarce.';
          } else if (err.name === 'NotFoundError') {
            capturedError = 'Nie wykryto kamery lub mikrofonu w Twoim urządzeniu.';
          } else {
            capturedError = err.message || 'Wystąpił błąd podczas żądania dostępu do mediów.';
          }
        }
      } else {
        // Individual requests
        if (wantCamera && !cameraGranted) {
          try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            vStream.getTracks().forEach((t) => t.stop());
            cameraGranted = true;
            if (isMountedRef.current) setCamera('granted');
          } catch (err: any) {
            cameraGranted = false;
            if (isMountedRef.current) {
              setCamera(err.name === 'NotAllowedError' ? 'denied' : 'prompt');
            }
            capturedError = err.name === 'NotAllowedError'
              ? 'Dostęp do kamery został odrzucony.'
              : err.message || 'Nie udało się uzyskać dostępu do kamery.';
          }
        }

        if (wantMic && !microphoneGranted) {
          try {
            const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            aStream.getTracks().forEach((t) => t.stop());
            microphoneGranted = true;
            if (isMountedRef.current) setMicrophone('granted');
          } catch (err: any) {
            microphoneGranted = false;
            if (isMountedRef.current) {
              setMicrophone(err.name === 'NotAllowedError' ? 'denied' : 'prompt');
            }
            capturedError = err.name === 'NotAllowedError'
              ? 'Dostęp do mikrofonu został odrzucony.'
              : err.message || 'Nie udało się uzyskać dostępu do mikrofonu.';
          }
        }
      }

      if (isMountedRef.current) {
        setIsRequesting(false);
        if (capturedError) {
          setError(capturedError);
        }
      }

      return {
        cameraGranted,
        microphoneGranted,
        error: capturedError
      };
    },
    [isSupported, camera, microphone]
  );

  const requestCamera = useCallback(async (): Promise<boolean> => {
    const res = await requestPermissions(['camera']);
    return res.cameraGranted;
  }, [requestPermissions]);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    const res = await requestPermissions(['microphone']);
    return res.microphoneGranted;
  }, [requestPermissions]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Initial check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkPermissions();

    const handleDeviceChange = () => {
      checkPermissions();
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      isMountedRef.current = false;
      if (cameraStatusRef.current) {
        cameraStatusRef.current.onchange = null;
      }
      if (micStatusRef.current) {
        micStatusRef.current.onchange = null;
      }
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [checkPermissions]);

  const hasCamera = camera === 'granted';
  const hasMicrophone = microphone === 'granted';
  const hasAllPermissions = hasCamera && hasMicrophone;

  const missingPermissions: ('camera' | 'microphone')[] = [];
  if (!hasCamera) missingPermissions.push('camera');
  if (!hasMicrophone) missingPermissions.push('microphone');

  return {
    camera,
    microphone,
    isChecking,
    isRequesting,
    hasCamera,
    hasMicrophone,
    hasAllPermissions,
    missingPermissions,
    error,
    isSupported,
    checkPermissions,
    requestPermissions,
    requestCamera,
    requestMicrophone,
    resetError
  };
}
