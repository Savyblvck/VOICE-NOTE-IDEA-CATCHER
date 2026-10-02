// Real-time 60fps Canvas Audio & Walking Rhythm Visualizer

export class CanvasVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.animationId = null;
    this.getAudioData = null;
    this.getVolume = null;
    this.isRecording = false;
    this.isPaused = false;
    this.mode = 'wave'; // 'wave' or 'bars'
    this.particles = [];
    this.phase = 0;
    this.pulseScale = 1;

    this.initParticles();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 300,
        radius: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: -Math.random() * 0.4 - 0.2,
        alpha: Math.random() * 0.4 + 0.1
      });
    }
  }

  start(audioEngine) {
    this.isRecording = true;
    this.isPaused = false;
    this.audioEngine = audioEngine;
    if (!this.animationId) {
      this.render();
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    this.isRecording = false;
    this.isPaused = false;
  }

  render() {
    this.animationId = requestAnimationFrame(() => this.render());
    if (!this.ctx || !this.width || !this.height) return;

    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    // Clear background with subtle persistence for motion trail
    ctx.clearRect(0, 0, width, height);

    // Update phase
    this.phase += 0.04;

    // Draw ambient floating particles
    this.drawParticles(ctx, width, height);

    if (!this.isRecording) {
      // Idle gentle undulating wave
      this.drawIdleWave(ctx, width, height);
      return;
    }

    if (this.isPaused) {
      // Paused steady dashed wave
      this.drawPausedState(ctx, width, height);
      return;
    }

    // Active live audio rendering
    const freqData = this.audioEngine?.getFrequencyData();
    const timeData = this.audioEngine?.getTimeDomainData();
    const volume = this.audioEngine?.getVolumeLevel() || 0.1;

    // Pulse scale calculation
    this.pulseScale = 1 + volume * 0.6;

    // Draw walking sound wave
    this.drawActiveWave(ctx, width, height, timeData, freqData, volume);
  }

  drawParticles(ctx, width, height) {
    ctx.save();
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < 0) p.y = height;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 92, 0, ${p.alpha * 0.4})`;
      ctx.fill();
    }
    ctx.restore();
  }

  drawIdleWave(ctx, width, height) {
    ctx.save();
    const centerY = height / 2;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(255, 92, 0, 0.1)');
    gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 92, 0, 0.1)');

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = gradient;
    ctx.beginPath();

    for (let x = 0; x < width; x += 4) {
      const y = centerY + Math.sin(x * 0.015 + this.phase) * 12 + Math.cos(x * 0.03 - this.phase * 0.5) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawPausedState(ctx, width, height) {
    ctx.save();
    const centerY = height / 2;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('WALK PAUSED — TAP RESUME', width / 2, centerY - 20);
    ctx.restore();
  }

  drawActiveWave(ctx, width, height, timeData, freqData, volume) {
    ctx.save();
    const centerY = height / 2;

    // Glowing core gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#FF5C00');
    gradient.addColorStop(0.3, '#FF3B30');
    gradient.addColorStop(0.7, '#8B5CF6');
    gradient.addColorStop(1, '#3B82F6');

    // 1. Draw glowing backdrop aura
    ctx.shadowBlur = 24 * this.pulseScale;
    ctx.shadowColor = 'rgba(255, 92, 0, 0.7)';

    // 2. Draw mirrored wave paths
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const sliceWidth = width / (timeData ? timeData.length : 64);
    let x = 0;

    if (timeData) {
      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0; // 0 to 2
        const amplitude = (v - 1.0) * (height * 0.45) * (1 + volume * 1.2);
        const y = centerY + amplitude;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
    } else {
      // Fallback synthetic wave with audio volume
      for (let px = 0; px < width; px += 3) {
        const amp = (Math.sin(px * 0.02 + this.phase * 3) * 35 + Math.sin(px * 0.05 - this.phase * 2) * 20) * (volume + 0.15);
        const py = centerY + amp;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // 3. Second subtle harmonic layer
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    x = 0;
    if (timeData) {
      for (let i = 0; i < timeData.length; i += 2) {
        const v = timeData[i] / 128.0;
        const amplitude = -(v - 1.0) * (height * 0.25) * (1 + volume);
        const y = centerY + amplitude;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth * 2;
      }
    }
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
