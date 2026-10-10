// Stage Definitions with Collision Platforms, Ledges, Moving Hazards, and Blast Zones

const STAGES = {
  battlefield: {
    id: 'battlefield',
    name: 'Battlefield',
    description: 'The definitive competitive platform layout: 1 solid floor and 3 tri-platforms.',
    width: 1200,
    height: 800,
    cameraLimits: { minX: -600, maxX: 600, minY: -450, maxY: 450 },
    blastzones: { left: -500, right: 500, top: -420, bottom: 420 },

    platforms: [
      // Main Solid Stage
      { id: 'main', x: -360, y: 150, width: 720, height: 260, isSemiSolid: false },
      // Left Tri-Platform
      { id: 'plat_left', x: -280, y: 30, width: 180, height: 14, isSemiSolid: true },
      // Right Tri-Platform
      { id: 'plat_right', x: 100, y: 30, width: 180, height: 14, isSemiSolid: true },
      // Top Tri-Platform
      { id: 'plat_top', x: -90, y: -90, width: 180, height: 14, isSemiSolid: true }
    ],

    ledges: [
      { id: 'left_ledge', x: -360, y: 150, facing: 1 },
      { id: 'right_ledge', x: 360, y: 150, facing: -1 }
    ],

    spawns: [
      { x: -180, y: 100 },
      { x: 180, y: 100 },
      { x: -90, y: 0 },
      { x: 90, y: 0 }
    ],

    drawBackground(ctx, stageWidth, stageHeight) {
      // Cosmic Nebula & Floating Celestial Spires
      const grad = ctx.createLinearGradient(0, -500, 0, 500);
      grad.addColorStop(0, '#0a0b22');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#030712');
      ctx.fillStyle = grad;
      ctx.fillRect(-800, -600, 1600, 1200);

      // Starry particles & distant planets
      ctx.fillStyle = '#ff007f';
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(320, -220, 180, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f5d4';
      ctx.beginPath();
      ctx.arc(-360, -180, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    },

    drawForeground(ctx) {
      // Draw Main Island Architecture
      ctx.save();
      // Main Stage Base
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(-360, 150, 720, 260);

      // Top Stone Lip
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-364, 146, 728, 12);
      ctx.fillStyle = '#38bdf8'; // Glowing neon runic accent
      ctx.fillRect(-360, 158, 720, 4);

      // Ruin underside taper
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-360, 162);
      ctx.lineTo(-200, 360);
      ctx.lineTo(200, 360);
      ctx.lineTo(360, 162);
      ctx.fill();

      // Semi-solid Floating Platforms
      for (const p of this.platforms) {
        if (!p.isSemiSolid) continue;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x, p.y + p.height - 3, p.width, 3);

        // Platform crystals underneath
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(p.x + 20, p.y + p.height);
        ctx.lineTo(p.x + p.width / 2, p.y + p.height + 14);
        ctx.lineTo(p.x + p.width - 20, p.y + p.height);
        ctx.fill();
      }

      ctx.restore();
    }
  },

  final_destination: {
    id: 'final_destination',
    name: 'Final Destination',
    description: 'Flat solitary battleground with no platform distractions. Pure skill and spacing.',
    width: 1200,
    height: 800,
    cameraLimits: { minX: -600, maxX: 600, minY: -450, maxY: 450 },
    blastzones: { left: -520, right: 520, top: -420, bottom: 420 },

    platforms: [
      { id: 'main', x: -400, y: 150, width: 800, height: 260, isSemiSolid: false }
    ],

    ledges: [
      { id: 'left_ledge', x: -400, y: 150, facing: 1 },
      { id: 'right_ledge', x: 400, y: 150, facing: -1 }
    ],

    spawns: [
      { x: -220, y: 100 },
      { x: 220, y: 100 },
      { x: -100, y: 100 },
      { x: 100, y: 100 }
    ],

    drawBackground(ctx) {
      // Hyperspace warp
      const grad = ctx.createRadialGradient(0, 0, 80, 0, 0, 700);
      grad.addColorStop(0, '#581c87');
      grad.addColorStop(0.6, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(-800, -600, 1600, 1200);

      // Rotating energy ring
      const time = Date.now() * 0.001;
      ctx.save();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 480, 240, time * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    drawForeground(ctx) {
      ctx.save();
      // Sleek crystalline runway
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-400, 150, 800, 260);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-404, 146, 808, 8);
      ctx.fillStyle = '#ec4899'; // Pink/Purple neon core
      ctx.fillRect(-400, 154, 800, 4);

      // Underside crystal spikes
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(-400, 158);
      ctx.lineTo(0, 380);
      ctx.lineTo(400, 158);
      ctx.fill();
      ctx.restore();
    }
  },

  smashville: {
    id: 'smashville',
    name: 'Smashville',
    description: 'Dynamic tournament stage featuring a single hovering platform that glides back and forth.',
    width: 1200,
    height: 800,
    cameraLimits: { minX: -600, maxX: 600, minY: -450, maxY: 450 },
    blastzones: { left: -500, right: 500, top: -420, bottom: 420 },

    platforms: [
      { id: 'main', x: -340, y: 150, width: 680, height: 260, isSemiSolid: false },
      // Moving Platform
      { id: 'moving_plat', x: -90, y: 30, width: 180, height: 14, isSemiSolid: true, isMoving: true }
    ],

    ledges: [
      { id: 'left_ledge', x: -340, y: 150, facing: 1 },
      { id: 'right_ledge', x: 340, y: 150, facing: -1 }
    ],

    spawns: [
      { x: -160, y: 100 },
      { x: 160, y: 100 },
      { x: 0, y: 0 },
      { x: 0, y: 100 }
    ],

    updateMovingPlatforms(frameCount) {
      // Oscillate moving platform horizontally
      const plat = this.platforms.find(p => p.id === 'moving_plat');
      if (plat) {
        const offset = Math.sin(frameCount * 0.015) * 170;
        plat.x = -90 + offset;
      }
    },

    drawBackground(ctx) {
      // Sunset Sky over Village
      const grad = ctx.createLinearGradient(0, -400, 0, 300);
      grad.addColorStop(0, '#fdba74'); // Orange sunset
      grad.addColorStop(0.5, '#f472b6'); // Pink
      grad.addColorStop(1, '#6366f1'); // Indigo twilight
      ctx.fillStyle = grad;
      ctx.fillRect(-800, -600, 1600, 1200);

      // Distant rolling green hills & festival lights
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(-200, 400, 500, 0, Math.PI * 2);
      ctx.arc(350, 420, 450, 0, Math.PI * 2);
      ctx.fill();
    },

    drawForeground(ctx) {
      ctx.save();
      // Wooden & cobblestone dock
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-340, 150, 680, 260);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-344, 146, 688, 10);

      // Moving platform
      const plat = this.platforms.find(p => p.id === 'moving_plat');
      if (plat) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
        // Festive lantern hanging below platform
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(plat.x + plat.width / 2, plat.y + 22, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
};
