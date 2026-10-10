// Core Smash Bros Engine: State Machine, Hitbox Physics, Projectiles, Game Loop, and HUD

class Fighter {
  constructor(charData, playerIndex = 0, isCPU = false) {
    this.charData = charData;
    this.characterId = charData.id;
    this.name = charData.name;
    this.playerIndex = playerIndex;
    this.isCPU = isCPU;

    // Body dimensions
    this.width = charData.width;
    this.height = charData.height;
    this.weight = charData.weight;
    this.walkSpeed = charData.walkSpeed;
    this.runSpeed = charData.runSpeed;
    this.jumpForce = charData.jumpForce;
    this.shortHopForce = charData.shortHopForce;
    this.doubleJumpForce = charData.doubleJumpForce;
    this.maxJumps = charData.maxJumps;
    this.fallSpeed = charData.fallSpeed;
    this.fastFallSpeed = charData.fastFallSpeed;
    this.shieldColor = charData.shieldColor;

    // Transform & Motion
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left

    // Combat Stats
    this.damage = 0;
    this.stocks = 3;
    this.jumpsLeft = this.maxJumps;
    this.isOnGround = false;
    this.isFastFalling = false;
    this.isDroppingThrough = false;

    // Shield & Dodge
    this.isShielding = false;
    this.shieldHp = 50;
    this.maxShieldHp = 50;
    this.shieldStunFrames = 0;
    this.isDizzy = false;
    this.dizzyTimer = 0;

    // Invulnerability & Hitstun
    this.invincibleFrames = 0;
    this.hitstunFrames = 0;
    this.hitlagFrames = 0;
    this.isTumbling = false;
    this.tumbleAngle = 0;

    // Attack State Machine
    this.currentAttack = null;
    this.attackFrame = 0;
    this.isChargingSmash = false;
    this.smashChargeFrames = 0;
    this.hasAirDodge = true;
    this.isHelpless = false; // After recovery special

    // Ledge State
    this.isHangingOnLedge = false;
    this.hangingLedge = null;
    this.ledgeCooldown = 0;
    this.ledgeHangTimer = 0;

    // Respawn State
    this.isRespawning = false;
    this.respawnTimer = 0;

    // Animation ticker
    this.animState = 'idle';
    this.animFrame = 0;
  }

  resetPosition(x, y) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = 0;
    this.vy = 0;
    this.damage = 0;
    this.jumpsLeft = this.maxJumps;
    this.isOnGround = false;
    this.isShielding = false;
    this.shieldHp = this.maxShieldHp;
    this.isDizzy = false;
    this.invincibleFrames = 60;
    this.hitstunFrames = 0;
    this.hitlagFrames = 0;
    this.currentAttack = null;
    this.isHangingOnLedge = false;
    this.isHelpless = false;
  }

  startAttack(moveName) {
    const move = this.charData.moves[moveName];
    if (!move) return;

    this.currentAttack = move;
    this.attackFrame = 0;
    this.isChargingSmash = false;
    this.smashChargeFrames = 0;

    // Special move impulses
    if (move.ascendVY) {
      this.vy = move.ascendVY;
      if (move.ascendVX) this.vx = this.facing * move.ascendVX;
      this.isOnGround = false;
    }
    if (move.burstVX) {
      this.vx = this.facing * move.burstVX;
    }
    if (move.causesHelpless) {
      this.isHelpless = true;
    }

    if (move.sound && sounds[move.sound]) {
      sounds[move.sound]();
    }
  }

  cancelAttack() {
    this.currentAttack = null;
    this.attackFrame = 0;
    this.isChargingSmash = false;
  }

  takeHit(hitbox, attacker) {
    if (this.invincibleFrames > 0) return false;

    // Shielding check
    if (this.isShielding && this.isOnGround) {
      const shieldDmg = hitbox.damage * (hitbox.shieldDamageMultiplier || 1.2);
      this.shieldHp -= shieldDmg;
      this.shieldStunFrames = Math.floor(shieldDmg * 0.8 + 4);
      this.vx = attacker.facing * 3;
      sounds.shieldHit();

      if (this.shieldHp <= 0) {
        // SHIELD BREAK!
        this.shieldHp = 0;
        this.isShielding = false;
        this.isDizzy = true;
        this.dizzyTimer = 360; // 6 seconds dizzy
        this.vy = -12; // Pop into air
        this.invincibleFrames = 0;
        sounds.shieldBreak();
        vfx.addHitSpark(this.x, this.y, 40, '#ff1744');
      }
      return true;
    }

    // Tough Guy Super Armor check
    if (this.charData.toughGuyArmorThreshold && hitbox.damage <= this.charData.toughGuyArmorThreshold && this.isOnGround) {
      this.damage += hitbox.damage;
      vfx.addHitSpark(this.x, this.y, 18, '#76ff03');
      sounds.hitLight();
      return true;
    }

    // Tipper sweetspot calculation for swordmaster
    let damage = hitbox.damage;
    let baseKnockback = hitbox.baseKnockback || 30;
    let knockbackGrowth = hitbox.knockbackGrowth || 50;

    if (attacker.charData.tipperMultiplier) {
      const tipDist = Math.abs((hitbox.x + hitbox.radius) - attacker.x);
      if (tipDist >= attacker.charData.tipperMultiplier.sweetspotOffset) {
        damage *= attacker.charData.tipperMultiplier.damage;
        baseKnockback *= attacker.charData.tipperMultiplier.knockback;
        sounds.hitSweetspot();
        vfx.addHitSpark(this.x, this.y, 42, '#00e5ff');
      }
    }

    // Charged smash damage scaling
    const chargeScale = hitbox.chargeScale || 1.0;

    const { knockback, finalDamage } = physics.calculateKnockback(
      this.damage,
      damage,
      this.weight,
      knockbackGrowth,
      baseKnockback,
      chargeScale
    );

    this.damage += Math.round(finalDamage);

    // Hitlag freeze duration
    const hitlag = physics.calculateHitlag(damage);
    this.hitlagFrames = hitlag;
    attacker.hitlagFrames = hitlag;

    // Hitstun duration
    this.hitstunFrames = physics.calculateHitstun(knockback);
    this.cancelAttack();
    this.isShielding = false;
    this.isDizzy = false;
    this.isHangingOnLedge = false;

    // Launch trajectory
    let launchAngle = hitbox.angle || 45;
    // Account for attacker facing direction
    if (attacker.facing < 0) {
      launchAngle = 180 - launchAngle;
    }

    // Launch velocity
    const launchRad = (launchAngle * Math.PI) / 180;
    const launchSpeed = knockback * 0.28;
    this.vx = Math.cos(launchRad) * launchSpeed;
    this.vy = -Math.sin(launchRad) * launchSpeed;

    // Tumble check
    if (knockback > 32) {
      this.isTumbling = true;
      this.tumbleAngle = Math.atan2(this.vy, this.vx);
    }

    // Sparks & Sound effects
    vfx.addHitSpark(this.x, this.y, Math.min(50, knockback * 0.5), '#ffd600');
    if (hitbox.isSpike) {
      sounds.hitHeavy();
    }

    return true;
  }
}

// Game State Controller
class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.stage = STAGES.battlefield;
    this.camera = new DynamicCamera();
    this.fighters = [];
    this.projectiles = [];
    this.frameCount = 0;
    this.gameState = 'menu'; // menu, playing, gameover, training
    this.gameMode = 'local_vs'; // local_vs, online, training
    this.isPaused = false;
    this.showHitboxes = false;
    this.winner = null;
    this.finishZoomTriggered = false;

    // Animation viewer mode
    this.isViewerMode = false;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupNetworkHooks();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  setupNetworkHooks() {
    network.on('matchStarted', (data) => {
      this.startOnlineMatch(data);
    });

    network.on('remoteInput', (data) => {
      // Feed remote player input to fighter
      if (this.fighters[1]) {
        this.fighters[1].remoteInput = data.input;
      }
    });

    network.on('playerKOBroadcast', (data) => {
      const victim = this.fighters.find(f => f.networkId === data.victimId);
      if (victim) {
        victim.stocks = data.stocksRemaining;
      }
    });

    network.on('matchFinished', (data) => {
      this.gameState = 'gameover';
      const winFighter = this.fighters.find(f => f.networkId === data.winnerId);
      this.winner = winFighter ? winFighter.name : 'Player 1';
      sounds.announcerCount('game');
    });
  }

  startMatch(p1CharId = 'brawler', p2CharId = 'space_ace', stageId = 'battlefield', mode = 'local_vs', cpuDiff = 6) {
    this.stage = STAGES[stageId] || STAGES.battlefield;
    this.gameMode = mode;
    this.gameState = 'playing';
    this.winner = null;
    this.finishZoomTriggered = false;
    this.projectiles = [];
    vfx.particles = [];

    const isP2CPU = mode === 'local_vs' || mode === 'training';

    const p1 = new Fighter(CHARACTERS[p1CharId], 0, false);
    const p2 = new Fighter(CHARACTERS[p2CharId], 1, isP2CPU);

    const spawn1 = this.stage.spawns[0] || { x: -160, y: 100 };
    const spawn2 = this.stage.spawns[1] || { x: 160, y: 100 };

    p1.resetPosition(spawn1.x, spawn1.y);
    p2.resetPosition(spawn2.x, spawn2.y);
    p1.facing = 1;
    p2.facing = -1;

    this.fighters = [p1, p2];

    if (isP2CPU) {
      this.p2AI = new BotAI(p2, p1, cpuDiff);
    } else {
      this.p2AI = null;
    }

    sounds.announcerCount('go');
  }

  startOnlineMatch(data) {
    const stageId = data.stageId || 'battlefield';
    const playerKeys = Object.keys(data.players);

    const isHost = network.isHost;
    const myId = network.myPlayerId;
    const opponentId = playerKeys.find(id => id !== myId);

    const p1Data = data.players[myId];
    const p2Data = data.players[opponentId];

    this.stage = STAGES[stageId];
    this.gameMode = 'online';
    this.gameState = 'playing';
    this.winner = null;
    this.projectiles = [];

    const p1 = new Fighter(CHARACTERS[p1Data.characterId], 0, false);
    p1.networkId = myId;

    const p2 = new Fighter(CHARACTERS[p2Data.characterId], 1, false);
    p2.networkId = opponentId;

    p1.resetPosition(this.stage.spawns[0].x, this.stage.spawns[0].y);
    p2.resetPosition(this.stage.spawns[1].x, this.stage.spawns[1].y);
    p1.facing = 1;
    p2.facing = -1;

    this.fighters = [p1, p2];
    this.p2AI = null;
  }

  // Spawn projectile (Fireball, Blaster, Thunder Jolt, etc.)
  spawnProjectile(owner, type) {
    const proj = {
      owner,
      type,
      x: owner.x + owner.facing * 24,
      y: owner.y - 4,
      vx: 0,
      vy: 0,
      radius: 8,
      life: 90,
      damage: 5,
      bounces: 0
    };

    if (type === 'fireball') {
      proj.vx = owner.facing * 7;
      proj.vy = 2;
      proj.radius = 9;
      proj.color = '#ff5722';
      proj.damage = 6;
      proj.bounces = 3;
    } else if (type === 'laser') {
      proj.vx = owner.facing * 18;
      proj.vy = 0;
      proj.radius = 4;
      proj.color = '#00e5ff';
      proj.damage = 3;
      proj.life = 40;
    } else if (type === 'thunder_jolt') {
      proj.vx = owner.facing * 6;
      proj.vy = 3;
      proj.radius = 10;
      proj.color = '#ffd600';
      proj.damage = 7;
    }

    this.projectiles.push(proj);
  }

  update() {
    if (this.isPaused || this.gameState !== 'playing') return;
    this.frameCount++;

    if (this.stage.updateMovingPlatforms) {
      this.stage.updateMovingPlatforms(this.frameCount);
    }

    // 1. Process Player Inputs
    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      if (f.stocks <= 0) continue;

      let input;
      if (f.isCPU && this.p2AI) {
        input = this.p2AI.update(this.stage);
      } else if (this.gameMode === 'online' && i === 1) {
        input = f.remoteInput || { x: 0, y: 0, jump: false, attack: false, special: false, shield: false };
      } else {
        input = inputManager.getInput(i);
        // Relay input in online multiplayer
        if (this.gameMode === 'online' && i === 0) {
          network.sendInput(this.frameCount, input);
        }
      }

      this.processFighterInput(f, input);
    }

    // 2. Physics & State updates
    for (const f of this.fighters) {
      this.updateFighterPhysics(f);
    }

    // 3. Projectiles update
    this.updateProjectiles();

    // 4. Hitbox vs Hurtbox Collisions
    this.processCombatCollisions();

    // 5. Blastzone Deaths & Win Condition
    this.checkBlastzones();

    // 6. Camera & VFX updates
    this.camera.update(this.fighters, this.stage);
    vfx.update();
  }

  processFighterInput(f, input) {
    if (f.hitlagFrames > 0) {
      // Directional Influence (DI) during hitlag
      if (Math.abs(input.x) > 0.3 || Math.abs(input.y) > 0.3) {
        f.diX = input.x;
        f.diY = input.y;
      }
      return;
    }

    if (f.hitstunFrames > 0 || f.isDizzy || f.isRespawning) return;

    // Ledge hang options
    if (f.isHangingOnLedge) {
      f.ledgeHangTimer--;
      if (f.ledgeHangTimer <= 0 || input.y > 0.5) {
        // Drop from ledge
        f.isHangingOnLedge = false;
        f.ledgeCooldown = 30;
      } else if (input.jump) {
        // Ledge jump
        f.isHangingOnLedge = false;
        f.vy = f.jumpForce;
        f.ledgeCooldown = 30;
        sounds.jump();
      } else if (input.attack) {
        // Ledge attack
        f.isHangingOnLedge = false;
        f.startAttack('dtilt');
        f.ledgeCooldown = 30;
      } else if (Math.sign(input.x) === f.facing) {
        // Ledge getup
        f.isHangingOnLedge = false;
        f.x += f.facing * 24;
        f.y = f.hangingLedge.y - f.height / 2;
        f.invincibleFrames = 15;
        f.ledgeCooldown = 30;
      }
      return;
    }

    // Shielding
    if (input.shield && f.isOnGround && !f.currentAttack) {
      f.isShielding = true;
      f.vx *= 0.5;
      f.shieldHp = Math.max(0, f.shieldHp - 0.14); // Slow shield decay

      // Spot Dodge (Shield + Down)
      if (input.y > 0.5) {
        f.isShielding = false;
        f.invincibleFrames = 18;
        sounds.dodge();
        return;
      }
      // Roll Forward / Backward (Shield + Left/Right)
      if (Math.abs(input.x) > 0.6) {
        f.isShielding = false;
        f.invincibleFrames = 16;
        f.vx = Math.sign(input.x) * 9;
        sounds.dodge();
        return;
      }
      return;
    } else {
      f.isShielding = false;
      // Shield regeneration when not shielding
      if (f.shieldHp < f.maxShieldHp && !f.isDizzy) {
        f.shieldHp = Math.min(f.maxShieldHp, f.shieldHp + 0.08);
      }
    }

    // Air Dodge
    if (input.shield && !f.isOnGround && f.hasAirDodge && !f.currentAttack) {
      f.hasAirDodge = false;
      f.invincibleFrames = 22;
      if (Math.abs(input.x) > 0.3 || Math.abs(input.y) > 0.3) {
        // Directional Air Dodge
        f.vx = input.x * 10;
        f.vy = input.y * 10;
      }
      sounds.dodge();
      return;
    }

    // Drop through semi-solid platforms (Down + Jump or strong Down tap)
    if (input.y > 0.6 && f.isOnGround && f.currentPlatform?.isSemiSolid) {
      f.isDroppingThrough = true;
      f.y += 4;
      f.isOnGround = false;
    } else {
      f.isDroppingThrough = false;
    }

    // Attacks & Smashes
    if (!f.currentAttack) {
      // Smash Attacks
      if (input.smash && input.attack) {
        if (Math.abs(input.x) > 0.3) {
          f.facing = Math.sign(input.x);
          f.startAttack('fsmash');
        } else if (input.y < -0.3) {
          f.startAttack('usmash');
        } else if (input.y > 0.3) {
          f.startAttack('dsmash');
        } else {
          f.startAttack('fsmash');
        }
      }
      // Normal Attacks / Tilts / Aerials
      else if (input.attack) {
        if (f.isOnGround) {
          if (Math.abs(input.x) > 0.4) {
            f.facing = Math.sign(input.x);
            f.startAttack('ftilt');
          } else if (input.y < -0.4) {
            f.startAttack('utilt');
          } else if (input.y > 0.4) {
            f.startAttack('dtilt');
          } else {
            f.startAttack('jab');
          }
        } else {
          // Aerials
          if (Math.abs(input.x) > 0.3) {
            const isForward = Math.sign(input.x) === f.facing;
            f.startAttack(isForward ? 'fair' : 'bair');
          } else if (input.y < -0.3) {
            f.startAttack('uair');
          } else if (input.y > 0.3) {
            f.startAttack('dair');
          } else {
            f.startAttack('nair');
          }
        }
      }
      // Special Moves (B-moves)
      else if (input.special && !f.isHelpless) {
        if (input.y < -0.4) {
          f.startAttack('up_special');
        } else if (Math.abs(input.x) > 0.4) {
          f.facing = Math.sign(input.x);
          f.startAttack('side_special');
        } else if (input.y > 0.4) {
          f.startAttack('down_special');
        } else {
          f.startAttack('neutral_special');
        }
      }
    }

    // Jump / Double Jump
    if (input.jump && !f.jumpHeld) {
      if (f.isOnGround) {
        f.vy = f.jumpForce;
        f.isOnGround = false;
        f.jumpsLeft--;
        sounds.jump();
        vfx.addDust(f.x, f.y + f.height / 2, f.vx);
      } else if (f.jumpsLeft > 0) {
        f.vy = f.doubleJumpForce;
        f.jumpsLeft--;
        sounds.doubleJump();
        vfx.addDust(f.x, f.y + f.height / 2, f.vx);
      }
    }
    f.jumpHeld = input.jump;

    // Ground & Aerial Movement
    if (!f.isShielding && (!f.currentAttack || !f.isOnGround)) {
      if (Math.abs(input.x) > 0.1) {
        f.facing = Math.sign(input.x);
        const targetSpeed = input.x * (f.isOnGround ? f.runSpeed : f.walkSpeed * 1.2);
        f.vx += (targetSpeed - f.vx) * 0.25;
      } else if (f.isOnGround) {
        f.vx *= physics.groundFriction;
      } else {
        f.vx *= physics.airResistance;
      }
    }

    // Fast Fall
    if (!f.isOnGround && input.y > 0.6 && f.vy > 0 && !f.isFastFalling) {
      f.isFastFalling = true;
      f.vy = f.fastFallSpeed * 14;
    }
  }

  updateFighterPhysics(f) {
    if (f.hitlagFrames > 0) {
      f.hitlagFrames--;
      if (f.hitlagFrames === 0 && f.diX !== undefined) {
        // Apply Directional Influence (DI) upon exiting hitlag
        const launchRad = Math.atan2(-f.vy, f.vx);
        const modifiedRad = physics.applyDI((launchRad * 180) / Math.PI, f.diX, f.diY);
        const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        f.vx = Math.cos(modifiedRad) * speed;
        f.vy = -Math.sin(modifiedRad) * speed;
        f.diX = undefined;
        f.diY = undefined;
      }
      return;
    }

    if (f.hitstunFrames > 0) {
      f.hitstunFrames--;
      if (f.hitstunFrames === 0) {
        f.isTumbling = false;
      }
    }

    if (f.invincibleFrames > 0) f.invincibleFrames--;
    if (f.ledgeCooldown > 0) f.ledgeCooldown--;
    if (f.dizzyTimer > 0) {
      f.dizzyTimer--;
      if (f.dizzyTimer <= 0) f.isDizzy = false;
    }

    // Advance attack frames
    if (f.currentAttack) {
      f.attackFrame++;
      const atk = f.currentAttack;

      // Projectile trigger frame
      if (atk.projectile && f.attackFrame === atk.startup) {
        this.spawnProjectile(f, atk.projectile);
      }

      const totalFrames = atk.startup + atk.active + atk.endlag;
      if (f.attackFrame >= totalFrames) {
        f.currentAttack = null;
        f.attackFrame = 0;
      }
    }

    f.prevX = f.x;
    f.prevY = f.y;

    // Apply gravity
    if (!f.isOnGround && !f.isHangingOnLedge) {
      f.vy += physics.gravity;
      const termVel = f.isFastFalling ? f.fastFallSpeed * 16 : physics.terminalVelocity;
      if (f.vy > termVel) f.vy = termVel;
    }

    // Integrate velocity
    f.x += f.vx;
    f.y += f.vy;

    // Platform collisions
    if (!f.isHangingOnLedge) {
      physics.resolvePlatformCollisions(f, this.stage.platforms);
      physics.checkLedgeGrab(f, this.stage);
    }

    if (f.isOnGround) {
      f.isFastFalling = false;
      f.isTumbling = false;
    }

    f.animFrame++;
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;

      // Gravity for bouncing projectiles
      if (p.type === 'fireball' || p.type === 'thunder_jolt') {
        p.vy += 0.35;
        // Bounce off main stage platform
        for (const plat of this.stage.platforms) {
          if (p.y + p.radius >= plat.y && p.y - p.radius <= plat.y + 10 && p.x >= plat.x && p.x <= plat.x + plat.width) {
            p.vy = -4.5;
            p.bounces--;
            sounds.fireball();
            break;
          }
        }
      }

      // Check hit against other fighters
      for (const f of this.fighters) {
        if (f === p.owner || f.stocks <= 0) continue;
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + f.width / 2) {
          f.takeHit({
            damage: p.damage,
            baseKnockback: 35,
            knockbackGrowth: 45,
            angle: 45
          }, p.owner);
          p.life = 0;
          break;
        }
      }

      if (p.life <= 0 || (p.bounces !== undefined && p.bounces < 0)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  processCombatCollisions() {
    for (const attacker of this.fighters) {
      if (!attacker.currentAttack || attacker.hitlagFrames > 0) continue;

      const atk = attacker.currentAttack;
      const isHitboxActive = attacker.attackFrame >= atk.startup && attacker.attackFrame < (atk.startup + atk.active);

      if (isHitboxActive) {
        const hx = attacker.x + (attacker.facing * (atk.offsetX || 20));
        const hy = attacker.y + (atk.offsetY || 0);
        const hitbox = {
          x: hx,
          y: hy,
          radius: (atk.range || 30) / 2,
          damage: atk.damage,
          baseKnockback: atk.baseKnockback,
          knockbackGrowth: atk.knockbackGrowth,
          angle: atk.angle,
          isSpike: atk.isSpike,
          shieldDamageMultiplier: atk.shieldDamageMultiplier
        };

        for (const defender of this.fighters) {
          if (defender === attacker || defender.stocks <= 0) continue;

          const hurtbox = {
            x: defender.x,
            y: defender.y,
            width: defender.width,
            height: defender.height
          };

          if (physics.checkHitboxCollision(hitbox, hurtbox)) {
            // Check Final Stock Kill Zoom condition
            if (defender.stocks === 1 && defender.damage >= 90 && hitbox.knockbackGrowth >= 85 && !this.finishZoomTriggered) {
              this.finishZoomTriggered = true;
              this.camera.triggerSpecialZoom(hx, hy, 28);
            }

            defender.takeHit(hitbox, attacker);
            this.camera.triggerShake(hitbox.damage * 0.9);
          }
        }
      }
    }
  }

  checkBlastzones() {
    const b = this.stage.blastzones;

    for (const f of this.fighters) {
      if (f.stocks <= 0) continue;

      const isDead = f.x < b.left || f.x > b.right || f.y < b.top || f.y > b.bottom;

      if (isDead) {
        f.stocks--;
        sounds.deathBlast();
        vfx.addHitSpark(f.x, f.y, 80, '#ff1744');
        this.camera.triggerShake(24);

        if (this.gameMode === 'online') {
          network.broadcastKO(f.networkId, f.stocks);
        }

        if (f.stocks <= 0) {
          // Match Finished
          this.gameState = 'gameover';
          const remaining = this.fighters.find(fighter => fighter.stocks > 0);
          this.winner = remaining ? remaining.name : 'Draw';
          sounds.announcerCount('game');

          if (this.gameMode === 'online' && network.isHost) {
            network.broadcastMatchEnd(remaining?.networkId);
          }
        } else {
          // Respawn at stage center top
          f.resetPosition(0, -120);
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply dynamic camera
    this.camera.applyTransform(ctx);

    // 1. Draw Stage Background
    this.stage.drawBackground(ctx, this.stage.width, this.stage.height);

    // 2. Draw Stage Platforms & Ledges
    this.stage.drawForeground(ctx);

    // 3. Draw Projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Draw Fighters
    for (const f of this.fighters) {
      if (f.stocks > 0) {
        CharacterRenderer.drawFighter(ctx, f);

        // Draw Debug Hitbox / Hurtbox overlay if enabled
        if (this.showHitboxes) {
          this.drawDebugBoxes(ctx, f);
        }
      }
    }

    // 5. Draw Visual Effects (VFX)
    vfx.draw(ctx);

    this.camera.restoreTransform(ctx);

    // 6. Draw HUD (Screen Space)
    this.drawHUD(ctx);
  }

  drawDebugBoxes(ctx, f) {
    ctx.save();
    // Blue Hurtbox
    ctx.strokeStyle = '#29b6f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(f.x - f.width / 2, f.y - f.height / 2, f.width, f.height);

    // Red Hitbox if attacking
    if (f.currentAttack) {
      const atk = f.currentAttack;
      if (f.attackFrame >= atk.startup && f.attackFrame < atk.startup + atk.active) {
        ctx.fillStyle = 'rgba(244, 67, 54, 0.45)';
        ctx.strokeStyle = '#d50000';
        ctx.beginPath();
        const hx = f.x + (f.facing * (atk.offsetX || 20));
        const hy = f.y + (atk.offsetY || 0);
        ctx.arc(hx, hy, (atk.range || 30) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawHUD(ctx) {
    if (this.gameState !== 'playing' && this.gameState !== 'gameover') return;

    const bottomY = this.canvas.height - 40;
    const cardWidth = 240;
    const cardHeight = 84;

    for (let i = 0; i < this.fighters.length; i++) {
      const f = this.fighters[i];
      const isP1 = i === 0;
      const cardX = isP1 ? 80 : this.canvas.width - cardWidth - 80;

      ctx.save();
      // Backdrop badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isP1 ? '#e53935' : '#1e88e5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, bottomY - cardHeight, cardWidth, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Fighter Name & Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillText(`${f.name} (P${i + 1})`, cardX + 16, bottomY - cardHeight + 24);

      // Percentage Damage with dynamic color ramping
      let dmgColor = '#ffffff';
      if (f.damage >= 150) dmgColor = '#ff1744';
      else if (f.damage >= 100) dmgColor = '#ff5722';
      else if (f.damage >= 50) dmgColor = '#ffeb3b';

      ctx.fillStyle = dmgColor;
      ctx.font = '900 36px "Impact", "Segoe UI", sans-serif';
      ctx.fillText(`${f.damage}%`, cardX + 16, bottomY - cardHeight + 66);

      // Stock icons
      for (let s = 0; s < f.stocks; s++) {
        ctx.fillStyle = isP1 ? '#e53935' : '#1e88e5';
        ctx.beginPath();
        ctx.arc(cardX + cardWidth - 24 - s * 22, bottomY - cardHeight + 28, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Game Over Overlay
    if (this.gameState === 'gameover') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.fillStyle = '#ffeb3b';
      ctx.font = '900 72px "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME!', this.canvas.width / 2, this.canvas.height / 2 - 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillText(`${this.winner} WINS!`, this.canvas.width / 2, this.canvas.height / 2 + 30);
      ctx.restore();
    }
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  }
}

const game = new Game();
