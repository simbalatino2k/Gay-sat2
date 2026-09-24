import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseScreenshotProtectionOptions {
  enabled?: boolean;
  featureName?: string; // 'album' | 'chat' | 'pictures' | 'general'
  protectOnBlur?: boolean;
  onAttempt?: (feature: string) => void;
}

export function useScreenshotProtection(options: UseScreenshotProtectionOptions = {}) {
  const {
    enabled = true,
    featureName = 'protected media',
    protectOnBlur = true,
    onAttempt
  } = options;

  const [isScreenshotAttempted, setIsScreenshotAttempted] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const attemptTimeoutRef = useRef<any>(null);

  const handleCaptureDetected = useCallback((trigger = 'shortcut') => {
    setIsScreenshotAttempted(true);

    // Overwrite clipboard to prevent screenshot or image data leaks
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(
          '🔒 AURA GAY 18+ — Zrzuty ekranu, pobieranie zdjęć i czatu są zablokowane ze względów bezpieczeństwa.'
        ).catch(() => {});
      } catch {}
    }

    if (onAttempt) {
      onAttempt(featureName);
    }

    if (attemptTimeoutRef.current) {
      clearTimeout(attemptTimeoutRef.current);
    }
    attemptTimeoutRef.current = setTimeout(() => {
      setIsScreenshotAttempted(false);
    }, 3800);
  }, [featureName, onAttempt]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Keyboard Interception for Screenshot and Print Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key (Windows / Linux)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        try {
          e.preventDefault();
        } catch {}
        handleCaptureDetected('PrintScreen');
        return;
      }

      // Windows Snipping Tool (Win + Shift + S) or Ctrl + Shift + S
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        try {
          e.preventDefault();
        } catch {}
        handleCaptureDetected('SnippingTool');
        return;
      }

      // macOS Screenshot shortcuts (Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        try {
          e.preventDefault();
        } catch {}
        handleCaptureDetected('MacScreenshot');
        return;
      }

      // Ctrl+P / Cmd+P (Print to PDF / Printer)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
        try {
          e.preventDefault();
        } catch {}
        handleCaptureDetected('Print');
        return;
      }

      // Ctrl+S / Cmd+S (Save webpage / images)
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
        try {
          e.preventDefault();
        } catch {}
        handleCaptureDetected('Save');
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        // Immediate clipboard sanitization on keyup
        if (navigator.clipboard?.writeText) {
          try {
            navigator.clipboard.writeText('');
          } catch {}
        }
        handleCaptureDetected('PrintScreenUp');
      }
    };

    // 2. Focus Loss & Visibility Change (Focus-loss Privacy Shield)
    // When external screenshot utilities, Snipping Tool, or screen recorders pop up,
    // the window loses active focus. Blurring content blocks screen capture.
    const handleBlur = () => {
      if (protectOnBlur) {
        setIsWindowBlurred(true);
      }
    };

    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (protectOnBlur) {
          setIsWindowBlurred(true);
        }
      } else {
        setIsWindowBlurred(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (attemptTimeoutRef.current) {
        clearTimeout(attemptTimeoutRef.current);
      }
    };
  }, [enabled, protectOnBlur, handleCaptureDetected]);

  return {
    isScreenshotAttempted,
    isWindowBlurred,
    dismissWarning: () => setIsScreenshotAttempted(false),
    triggerAttempt: handleCaptureDetected
  };
}
