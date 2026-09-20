/**
 * AURA Video Effects Service
 * Handles real-time video processing, Canvas/WebGL filters, and Snapchat Camera Kit Web SDK integration.
 * Pipes the processed stream into WebRTC RTCPeerConnection via RTCRtpSender.replaceTrack().
 */

export interface VideoEffect {
  id: string;
  name: string;
  category: 'aura' | 'snap';
  description: string;
  previewColor?: string;
  snapLensId?: string;
  snapGroupId?: string;
}

export const APPROVED_EFFECTS: VideoEffect[] = [
  {
    id: 'none',
    name: 'Bez efektu',
    category: 'aura',
    description: 'Naturalny obraz bezpośrednio z kamery bez filtrów.'
  },
  {
    id: 'aura_neon',
    name: 'AURA Violet Neon',
    category: 'aura',
    description: 'Fioletowo-neonowa poświata i wyrazisty, elegancki kontrast.',
    previewColor: '#a855f7'
  },
  {
    id: 'cyber_noir',
    name: 'Cyber Noir',
    category: 'aura',
    description: 'Monochromatyczny styl noir z subtelnym chłodnym akcentem.',
    previewColor: '#38bdf8'
  },
  {
    id: 'warm_sunset',
    name: 'Warm Sunset',
    category: 'aura',
    description: 'Ciepłe, złote oświetlenie analogowej kliszy w stylu golden hour.',
    previewColor: '#f59e0b'
  },
  {
    id: 'soft_glow',
    name: 'Soft Beauty Glow',
    category: 'aura',
    description: 'Delikatne wygładzenie i promienne, miękkie światło portretowe.',
    previewColor: '#ec4899'
  }
];

export interface SnapCameraKitConfig {
  apiToken?: string;
  lensGroupId?: string;
}

class VideoEffectsManager {
  private activeEffectId = 'none';
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private inputVideo: HTMLVideoElement | null = null;
  private inputStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private cameraKitSession: any = null;
  private cameraKitInstance: any = null;
  private snapSupported = false;
  private isProcessing = false;

  /**
   * Initializes the offscreen processing canvas.
   */
  private getCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    }
    return { canvas: this.canvas, ctx: this.ctx! };
  }

  /**
   * Lazy-loads Snapchat Camera Kit Web SDK if an API token is provided in environment or config.
   */
  public async loadSnapCameraKit(config?: SnapCameraKitConfig): Promise<boolean> {
    const apiToken = config?.apiToken || (import.meta as any).env?.VITE_SNAP_CAMERA_KIT_API_TOKEN;
    if (!apiToken) {
      console.log('[Snap Camera Kit] Brak skonfigurowanego klucza API w środowisku. Dostępne są natywne efekty AURA.');
      this.snapSupported = false;
      return false;
    }

    try {
      // Dynamic lazy-load of @snap/camera-kit SDK
      const { bootstrapCameraKit } = await import('@snap/camera-kit');
      this.cameraKitInstance = await bootstrapCameraKit({
        apiToken
      });
      this.snapSupported = true;
      return true;
    } catch (err) {
      console.warn('[Snap Camera Kit] Inicjalizacja SDK nie powiodła się, zachowano standardowe efekty:', err);
      this.snapSupported = false;
      return false;
    }
  }

  /**
   * Sets up input video element from the raw camera stream.
   */
  public setInputStream(stream: MediaStream): void {
    this.inputStream = stream;

    if (!this.inputVideo) {
      this.inputVideo = document.createElement('video');
      this.inputVideo.autoplay = true;
      this.inputVideo.muted = true;
      this.inputVideo.playsInline = true;
    }

    this.inputVideo.srcObject = stream;
    this.inputVideo.play().catch(e => console.warn('Input video play error:', e));
  }

  /**
   * Applies selected effect and returns the processed video track to substitute into WebRTC RTCPeerConnection.
   */
  public async applyEffect(
    effectId: string,
    rawStream: MediaStream,
    videoSender?: RTCRtpSender | null
  ): Promise<MediaStreamTrack | null> {
    this.activeEffectId = effectId;
    this.setInputStream(rawStream);

    const [rawTrack] = rawStream.getVideoTracks();
    if (!rawTrack) return null;

    if (effectId === 'none') {
      // Stop canvas rendering loop
      this.stopProcessing();
      // Restore raw pristine camera track in WebRTC
      if (videoSender && rawTrack) {
        await videoSender.replaceTrack(rawTrack);
      }
      return rawTrack;
    }

    // Start offscreen canvas rendering
    const { canvas, ctx } = this.getCanvas();
    this.startRenderingLoop(effectId, canvas, ctx);

    if (!this.processedStream) {
      this.processedStream = canvas.captureStream(30);
    }

    const [processedTrack] = this.processedStream.getVideoTracks();
    if (processedTrack && videoSender) {
      // Replaces the track on WebRTC peer connection so the remote party sees the effect
      await videoSender.replaceTrack(processedTrack);
    }

    return processedTrack || rawTrack;
  }

  /**
   * Offscreen real-time rendering loop applying shader-grade styling.
   */
  private startRenderingLoop(
    effectId: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): void {
    this.stopProcessing();
    this.isProcessing = true;

    const render = () => {
      if (!this.isProcessing) return;

      if (this.inputVideo && this.inputVideo.readyState >= 2) {
        const vw = this.inputVideo.videoWidth || 1280;
        const vh = this.inputVideo.videoHeight || 720;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        ctx.save();

        if (effectId === 'aura_neon') {
          // AURA Violet Neon: enhanced saturation, violet hue shift, soft neon aura
          ctx.filter = 'contrast(1.15) saturate(1.25) brightness(1.05)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);

          // Add subtle ambient violet bloom overlay
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Dark vignette border
          ctx.globalCompositeOperation = 'multiply';
          const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.35,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.75
          );
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(1, 'rgba(80, 20, 120, 0.85)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'cyber_noir') {
          // Cyber Noir: high contrast B&W with electric cyan/slate cold tone
          ctx.filter = 'grayscale(1) contrast(1.3) brightness(0.95)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'warm_sunset') {
          // Warm Sunset: rich golden hour film warmth
          ctx.filter = 'contrast(1.08) brightness(1.05) saturate(1.2)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);

          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'soft_glow') {
          // Soft Beauty Glow: radiant skin tone and diffused highlights
          ctx.filter = 'brightness(1.08) contrast(1.02) saturate(1.08)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(236, 72, 153, 0.07)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else {
          ctx.filter = 'none';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  public stopProcessing(): void {
    this.isProcessing = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public cleanup(): void {
    this.stopProcessing();
    if (this.inputVideo) {
      this.inputVideo.srcObject = null;
      this.inputVideo = null;
    }
    if (this.processedStream) {
      this.processedStream.getTracks().forEach(t => t.stop());
      this.processedStream = null;
    }
    this.activeEffectId = 'none';
  }

  public getActiveEffectId(): string {
    return this.activeEffectId;
  }

  public isSnapAvailable(): boolean {
    return this.snapSupported;
  }
}

export const videoEffectsService = new VideoEffectsManager();
