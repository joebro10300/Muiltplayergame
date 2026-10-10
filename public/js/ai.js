// AI Opponent with Recovery, Spacing, Combos, and Difficulty Scaling (Level 1-9)

class BotAI {
  constructor(fighter, target, difficulty = 6) {
    this.fighter = fighter;
    this.target = target;
    this.difficulty = difficulty; // 1 to 9
    this.reactionTimer = 0;
    this.decisionTimer = 0;
    this.currentIntent = 'idle';
    this.input = {
      x: 0,
      y: 0,
      jump: false,
      attack: false,
      special: false,
      shield: false,
      grab: false,
      smash: false
    };
  }

  update(stage) {
    const f = this.fighter;
    const t = this.target;

    // Reset single-frame inputs
    this.input.jump = false;
    this.input.attack = false;
    this.input.special = false;
    this.input.grab = false;
    this.input.smash = false;
    this.input.x = 0;
    this.input.y = 0;

    if (f.stocks <= 0 || f.isDizzy) return this.input;

    // Ledge Hang Recovery
    if (f.isHangingOnLedge) {
      if (Math.random() < 0.05 + this.difficulty * 0.01) {
        if (Math.random() < 0.4) {
          this.input.jump = true; // Ledge jump
        } else if (Math.random() < 0.7) {
          this.input.attack = true; // Ledge attack
        } else {
          this.input.x = f.facing; // Neutral getup
        }
      }
      return this.input;
    }

    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 1. Off-Stage Recovery Priority
    const stageLeft = -380;
    const stageRight = 380;
    const isOffStage = f.x < stageLeft || f.x > stageRight || f.y > 180;

    if (isOffStage && !f.isOnGround) {
      // Steer horizontally toward stage center
      this.input.x = f.x < 0 ? 1 : -1;

      // Double jump if dropping
      if (f.vy > 1 && f.jumpsLeft > 0) {
        this.input.jump = true;
      }

      // Up-Special recovery if jumps depleted or below stage level
      if (f.y > 100 && !f.isHelpless) {
        this.input.y = -1;
        this.input.special = true;
      }
      return this.input;
    }

    // 2. Defensive Shielding & Dodging
    const reactionRoll = Math.random() * 10;
    if (this.difficulty >= 4 && dist < 70 && t.currentAttack && reactionRoll < this.difficulty) {
      if (f.isOnGround && !f.isShielding && f.shieldHp > 15) {
        this.input.shield = true;
        // Spot dodge occasionally on high difficulty
        if (this.difficulty >= 7 && Math.random() < 0.25) {
          this.input.y = 1;
        }
        return this.input;
      }
    }

    // Release shield if opponent is not attacking or too far
    if (f.isShielding && (!t.currentAttack || dist > 90)) {
      this.input.shield = false;
    }

    // 3. Spacing & Neutral Combat
    this.decisionTimer--;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = Math.max(3, 14 - this.difficulty);

      // Face opponent
      f.facing = dx >= 0 ? 1 : -1;

      if (dist > 180) {
        // Approach opponent
        this.input.x = dx > 0 ? 1 : -1;

        // Occasional projectile poke
        if (Math.random() < 0.15 && Math.abs(dy) < 60) {
          this.input.special = true;
        }

        // Jump approach
        if (t.y < f.y - 40 && Math.random() < 0.35) {
          this.input.jump = true;
        }
      } else if (dist > 65) {
        // Mid-range footsies
        this.input.x = dx > 0 ? 0.7 : -0.7;

        if (Math.abs(dy) < 40 && Math.random() < 0.4) {
          // Dash attack or tilt
          this.input.attack = true;
          this.input.x = dx > 0 ? 1 : -1;
        } else if (t.y < f.y - 30) {
          // Aerial approach
          this.input.jump = true;
          if (f.isOnGround === false) {
            this.input.attack = true;
            this.input.y = -1; // Up air
          }
        }
      } else {
        // In Close-Combat Range: Attack!
        const rand = Math.random();

        if (t.damage > 85 && rand < 0.45 + this.difficulty * 0.05) {
          // Kill move: Smash attack!
          this.input.smash = true;
          this.input.attack = true;
          if (Math.abs(dx) > 20) {
            this.input.x = dx > 0 ? 1 : -1;
          } else {
            this.input.y = -1; // Up-Smash
          }
        } else if (rand < 0.4) {
          // Tilt or Jab combo
          this.input.attack = true;
          if (Math.abs(dy) < 15) {
            this.input.x = dx > 0 ? 1 : -1; // Forward tilt
          } else if (dy < -10) {
            this.input.y = -1; // Up tilt
          } else {
            this.input.y = 1; // Down tilt
          }
        } else if (rand < 0.6) {
          // Grab
          this.input.grab = true;
        } else if (rand < 0.8) {
          // Special move
          this.input.special = true;
          if (Math.abs(dx) > 30) this.input.x = dx > 0 ? 1 : -1;
        } else {
          // Jump & Aerial
          this.input.jump = true;
          this.input.attack = true;
          if (dy > 20) this.input.y = 1; // Down air spike
          else this.input.x = dx > 0 ? 1 : -1; // Forward air
        }
      }
    }

    return this.input;
  }
}
