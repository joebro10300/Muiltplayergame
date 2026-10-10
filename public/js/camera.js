// Dynamic Smash Bros Camera with Multi-Target Framing, Smooth Lerp, Shake, and Kill Zoom

class DynamicCamera {
  constructor(canvasWidth = 1280, canvasHeight = 720) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1.0;

    // Shake properties
    this.shakeIntensity = 0;
    this.shakeDecay = 0.88;

    // Special Kill Zoom state
    this.isKillZoom = false;
    this.killZoomTimer = 0;
  }

  resize(w, h) {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  triggerShake(intensity = 15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  triggerSpecialZoom(x, y, durationFrames = 25) {
    this.isKillZoom = true;
    this.killZoomTimer = durationFrames;
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = 1.6;
    sounds.specialZoom();
  }

  update(fighters, stage) {
    if (this.isKillZoom) {
      this.killZoomTimer--;
      if (this.killZoomTimer <= 0) {
        this.isKillZoom = false;
      }
    }

    if (!this.isKillZoom) {
      const activeFighters = fighters.filter(f => f.stocks > 0);
      if (activeFighters.length === 0) return;

      // Calculate bounding box of all active fighters
      let minX = activeFighters[0].x;
      let maxX = activeFighters[0].x;
      let minY = activeFighters[0].y;
      let maxY = activeFighters[0].y;

      for (let i = 1; i < activeFighters.length; i++) {
        const f = activeFighters[i];
        if (f.x < minX) minX = f.x;
        if (f.x > maxX) maxX = f.x;
        if (f.y < minY) minY = f.y;
        if (f.y > maxY) maxY = f.y;
      }

      // Center point
      this.targetX = (minX + maxX) / 2;
      this.targetY = (minY + maxY) / 2 - 20; // Bias slightly upward

      // Distance span with padding
      const paddingX = 360;
      const paddingY = 260;
      const spanX = Math.max(480, (maxX - minX) + paddingX);
      const spanY = Math.max(340, (maxY - minY) + paddingY);

      // Desired zoom to fit both players
      const zoomX = this.canvasWidth / spanX;
      const zoomY = this.canvasHeight / spanY;
      let desiredZoom = Math.min(zoomX, zoomY);

      // Clamp zoom bounds
      desiredZoom = Math.max(0.68, Math.min(1.25, desiredZoom));
      this.targetZoom = desiredZoom;
    }

    // Smooth exponential damping
    const lerpSpeed = this.isKillZoom ? 0.25 : 0.08;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.zoom += (this.targetZoom - this.zoom) * lerpSpeed;

    // Screen Shake damping
    if (this.shakeIntensity > 0.2) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }
  }

  applyTransform(ctx) {
    ctx.save();
    // Center of screen
    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);

    // Apply shake offset
    if (this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      ctx.translate(offsetX, offsetY);
    }

    // Apply zoom & camera position
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
