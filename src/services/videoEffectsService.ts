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
  },
  {
    id: 'rose_blush',
    name: 'Różowy blask',
    category: 'aura',
    description: 'Jasny, różowy odcień z miękkim światłem przy krawędziach.',
    previewColor: '#fb7185'
  },
  {
    id: 'ocean_breeze',
    name: 'Ocean',
    category: 'aura',
    description: 'Chłodne, błękitne światło i świeży kontrast.',
    previewColor: '#22d3ee'
  },
  {
    id: 'retro_film',
    name: 'Retro film',
    category: 'aura',
    description: 'Ciepła sepia, winieta i delikatne filmowe ziarno.',
    previewColor: '#d4a373'
  },
  {
    id: 'prism_pop',
    name: 'Prism Pop',
    category: 'aura',
    description: 'Żywe kolory z fioletową i turkusową poświatą.',
    previewColor: '#c084fc'
  },
  {
    id: 'starlight',
    name: 'Gwiazdy',
    category: 'aura',
    description: 'Rozświetlony obraz i migoczące gwiazdki przy krawędziach.',
    previewColor: '#facc15'
  },
  {
    id: 'dream_bubbles',
    name: 'Bańki',
    category: 'aura',
    description: 'Pastelowy odcień i unoszące się bańki wokół kadru.',
    previewColor: '#a5b4fc'
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
  private inputTrackId: string | null = null;
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

    const videoTrack = stream.getVideoTracks()[0];
    if (this.inputVideo.srcObject !== stream || this.inputTrackId !== (videoTrack?.id || null)) {
      // Rebinding also covers a camera switch that changes the track on the same MediaStream.
      this.inputVideo.srcObject = null;
      this.inputVideo.srcObject = stream;
      this.inputTrackId = videoTrack?.id || null;
      this.inputVideo.play().catch(e => console.warn('Input video play error:', e));
    }
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
      // Restore raw pristine camera track in WebRTC
      if (videoSender) {
        await videoSender.replaceTrack(rawTrack);
      }
      this.stopProcessing();
      this.processedStream?.getTracks().forEach(track => track.stop());
      this.processedStream = null;
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
   * Offscreen real-time rendering loop for native camera effects.
   */
  private startRenderingLoop(
    effectId: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): void {
    this.stopProcessing();
    this.isProcessing = true;

    let lastFrameAt = 0;
    const render = (time: number) => {
      if (!this.isProcessing) return;

      // Match captureStream(30) and avoid drawing twice as often on mobile screens.
      if (time - lastFrameAt < 1000 / 30) {
        this.animFrameId = requestAnimationFrame(render);
        return;
      }
      lastFrameAt = time;

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

        } else if (effectId === 'rose_blush') {
          ctx.filter = 'brightness(1.08) contrast(1.03) saturate(1.12)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          const rose = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.12, canvas.width / 2, canvas.height / 2, canvas.width * 0.75);
          rose.addColorStop(0, 'rgba(255, 225, 235, 0)');
          rose.addColorStop(1, 'rgba(251, 113, 133, 0.24)');
          ctx.fillStyle = rose;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'ocean_breeze') {
          ctx.filter = 'brightness(1.06) contrast(1.1) saturate(1.06)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          ctx.globalCompositeOperation = 'screen';
          const ocean = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          ocean.addColorStop(0, 'rgba(34, 211, 238, 0.13)');
          ocean.addColorStop(0.55, 'rgba(34, 211, 238, 0)');
          ocean.addColorStop(1, 'rgba(37, 99, 235, 0.16)');
          ctx.fillStyle = ocean;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'retro_film') {
          ctx.filter = 'sepia(0.55) contrast(1.13) saturate(0.8)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.78);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(55, 31, 17, 0.34)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Sparse, deterministic speckles create texture without reading pixels.
          ctx.fillStyle = 'rgba(255, 243, 211, 0.14)';
          for (let i = 0; i < 36; i++) {
            const x = ((i * 257 + Math.floor(time / 90) * 79) % 997) / 997 * canvas.width;
            const y = ((i * 619 + Math.floor(time / 90) * 113) % 991) / 991 * canvas.height;
            ctx.fillRect(x, y, 1.5, 1.5);
          }

        } else if (effectId === 'prism_pop') {
          ctx.filter = 'contrast(1.18) saturate(1.5) brightness(1.04)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          ctx.globalCompositeOperation = 'screen';
          const prism = ctx.createLinearGradient(0, 0, canvas.width, 0);
          prism.addColorStop(0, 'rgba(217, 70, 239, 0.22)');
          prism.addColorStop(0.45, 'rgba(217, 70, 239, 0)');
          prism.addColorStop(1, 'rgba(34, 211, 238, 0.22)');
          ctx.fillStyle = prism;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

        } else if (effectId === 'starlight') {
          ctx.filter = 'brightness(1.1) saturate(1.08)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          this.drawStars(ctx, canvas.width, canvas.height, time);

        } else if (effectId === 'dream_bubbles') {
          ctx.filter = 'brightness(1.07) saturate(0.9) contrast(0.97)';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(165, 180, 252, 0.08)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'source-over';
          this.drawBubbles(ctx, canvas.width, canvas.height, time);

        } else {
          ctx.filter = 'none';
          ctx.drawImage(this.inputVideo, 0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const positions = [[0.08, 0.2], [0.15, 0.68], [0.86, 0.16], [0.94, 0.58], [0.77, 0.85]];
    ctx.lineCap = 'round';
    positions.forEach(([px, py], index) => {
      const radius = Math.min(width, height) * (0.012 + 0.007 * (1 + Math.sin(time / 380 + index * 2.1)));
      const x = px * width;
      const y = py * height;
      ctx.strokeStyle = `rgba(255, 245, 196, ${0.45 + 0.35 * (1 + Math.sin(time / 430 + index * 1.8)) / 2})`;
      ctx.lineWidth = Math.max(2, radius * 0.18);
      ctx.beginPath();
      ctx.moveTo(x - radius, y);
      ctx.lineTo(x + radius, y);
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x, y + radius);
      ctx.stroke();
    });
  }

  private drawBubbles(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const positions = [[0.08, 0.18], [0.18, 0.62], [0.9, 0.23], [0.81, 0.68], [0.06, 0.85], [0.95, 0.88]];
    ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.003);
    positions.forEach(([px, py], index) => {
      const radius = Math.min(width, height) * (0.025 + index % 3 * 0.012);
      const x = px * width + Math.sin(time / 850 + index) * radius * 0.35;
      const y = py * height - Math.sin(time / 1100 + index * 1.4) * radius * 0.6;
      ctx.strokeStyle = 'rgba(238, 220, 255, 0.6)';
      ctx.fillStyle = 'rgba(192, 132, 252, 0.1)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  public stopProcessing(): void {
    this.isProcessing = false;
    if (this.animFrameId !== null) {
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
    this.inputTrackId = null;
    this.inputStream = null;
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
