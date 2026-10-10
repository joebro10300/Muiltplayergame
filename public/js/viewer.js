// Animation & Frame Data Studio Tool for Character Development and Inspection

class AnimationViewer {
  constructor() {
    this.active = false;
    this.currentCharId = 'brawler';
    this.currentAnimName = 'idle';
    this.playbackSpeed = 1.0;
    this.isPlaying = true;
    this.frameIndex = 0;
    this.showHitboxes = true;
    this.showHurtboxes = true;
    this.dummyFighter = null;
  }

  init() {
    this.setupDummyFighter();
  }

  setupDummyFighter() {
    this.dummyFighter = new Fighter(CHARACTERS[this.currentCharId], 0, false);
    this.dummyFighter.x = 0;
    this.dummyFighter.y = 0;
    this.dummyFighter.facing = 1;
    this.dummyFighter.isOnGround = true;
    this.frameIndex = 0;

    if (this.currentAnimName !== 'idle') {
      this.dummyFighter.startAttack(this.currentAnimName);
    }
  }

  selectCharacter(charId) {
    if (!CHARACTERS[charId]) return;
    this.currentCharId = charId;
    this.setupDummyFighter();
    this.updateUI();
  }

  selectAnimation(animName) {
    this.currentAnimName = animName;
    this.dummyFighter.cancelAttack();
    if (animName !== 'idle') {
      this.dummyFighter.startAttack(animName);
    }
    this.frameIndex = 0;
    this.updateUI();
  }

  stepFrame(delta = 1) {
    this.isPlaying = false;
    this.frameIndex += delta;
    if (this.dummyFighter.currentAttack) {
      this.dummyFighter.attackFrame = this.frameIndex;
    }
    this.updateUI();
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
  }

  updateUI() {
    const char = CHARACTERS[this.currentCharId];
    const move = char.moves[this.currentAnimName];

    const statsElem = document.getElementById('viewer-frame-stats');
    if (!statsElem) return;

    if (move) {
      const total = move.startup + move.active + move.endlag;
      statsElem.innerHTML = `
        <div class="stat-row"><strong>Move:</strong> ${move.name.toUpperCase()}</div>
        <div class="stat-row"><strong>Type:</strong> ${move.type}</div>
        <div class="stat-row"><strong>Startup:</strong> Frame 1 - ${move.startup}</div>
        <div class="stat-row"><strong style="color:#ff1744">Active Window:</strong> Frame ${move.startup + 1} - ${move.startup + move.active}</div>
        <div class="stat-row"><strong>Endlag:</strong> ${move.endlag} frames (Total: ${total}f)</div>
        <div class="stat-row"><strong>Base Damage:</strong> ${move.damage}%</div>
        <div class="stat-row"><strong>Launch Angle:</strong> ${move.angle}°</div>
        <div class="stat-row"><strong>Knockback Growth:</strong> ${move.knockbackGrowth}</div>
        <div class="stat-row"><strong>Current Frame:</strong> ${this.dummyFighter.attackFrame || 0} / ${total}</div>
      `;
    } else {
      statsElem.innerHTML = `
        <div class="stat-row"><strong>State:</strong> IDLE / NEUTRAL</div>
        <div class="stat-row"><strong>Weight:</strong> ${char.weight}</div>
        <div class="stat-row"><strong>Run Speed:</strong> ${char.runSpeed}</div>
        <div class="stat-row"><strong>Fall Speed:</strong> ${char.fallSpeed}</div>
      `;
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    ctx.save();
    // Grid backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Coordinate Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2 + 50;

    for (let x = 0; x < canvasWidth; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // Floor line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 200, centerY + this.dummyFighter.height / 2);
    ctx.lineTo(centerX + 200, centerY + this.dummyFighter.height / 2);
    ctx.stroke();

    // Draw Dummy Fighter centered
    ctx.translate(centerX, centerY);
    CharacterRenderer.drawFighter(ctx, this.dummyFighter);

    // Draw Hurtbox
    if (this.showHurtboxes) {
      ctx.strokeStyle = '#29b6f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        -this.dummyFighter.width / 2,
        -this.dummyFighter.height / 2,
        this.dummyFighter.width,
        this.dummyFighter.height
      );
    }

    // Draw Hitbox if in active frames
    if (this.showHitboxes && this.dummyFighter.currentAttack) {
      const atk = this.dummyFighter.currentAttack;
      const fNum = this.dummyFighter.attackFrame;
      const isActive = fNum >= atk.startup && fNum < (atk.startup + atk.active);

      if (isActive) {
        ctx.fillStyle = 'rgba(244, 67, 54, 0.5)';
        ctx.strokeStyle = '#d50000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const hx = (atk.offsetX || 20);
        const hy = (atk.offsetY || 0);
        ctx.arc(hx, hy, (atk.range || 30) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // Advance frame if playing
    if (this.isPlaying) {
      this.frameIndex++;
      if (this.dummyFighter.currentAttack) {
        this.dummyFighter.attackFrame = this.frameIndex;
        const total = atkTotal(this.dummyFighter.currentAttack);
        if (this.frameIndex > total) {
          this.frameIndex = 0;
          this.dummyFighter.attackFrame = 0;
        }
      } else {
        this.dummyFighter.animFrame = this.frameIndex;
      }
      this.updateUI();
    }
  }
}

function atkTotal(atk) {
  return (atk.startup || 0) + (atk.active || 0) + (atk.endlag || 0);
}

const viewer = new AnimationViewer();
