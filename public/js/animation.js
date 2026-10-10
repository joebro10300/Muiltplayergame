// Procedural Skeletal & VFX Rendering Engine with Sprite Sheet Support

class VFXManager {
  constructor() {
    this.particles = [];
  }

  addHitSpark(x, y, size = 20, color = '#ffeb3b') {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 3;
      this.particles.push({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.04,
        size: Math.random() * 4 + 2
      });
    }
    // Central shockwave ring
    this.particles.push({
      type: 'ring',
      x,
      y,
      radius: 5,
      maxRadius: size * 1.8,
      color,
      life: 1.0,
      decay: 0.1
    });
  }

  addSlashArc(x, y, facing, angle, radius = 40, color = '#ffffff') {
    this.particles.push({
      type: 'slash',
      x,
      y,
      facing,
      angle,
      radius,
      color,
      life: 1.0,
      decay: 0.15
    });
  }

  addDust(x, y, vx = 0) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 10,
        y: y + Math.random() * 4,
        vx: vx * 0.3 + (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5 - 0.5,
        color: 'rgba(220, 220, 220, 0.7)',
        life: 1.0,
        decay: 0.06,
        size: Math.random() * 6 + 4
      });
    }
  }

  addFire(x, y, facing) {
    this.particles.push({
      type: 'fire',
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: facing * (Math.random() * 2 + 1),
      vy: -Math.random() * 2 - 1,
      color: Math.random() > 0.4 ? '#ff5722' : '#ffeb3b',
      life: 1.0,
      decay: 0.08,
      size: Math.random() * 8 + 4
    });
  }

  addLightning(x1, y1, x2, y2, color = '#00e5ff') {
    this.particles.push({
      type: 'lightning',
      x1, y1, x2, y2,
      color,
      life: 1.0,
      decay: 0.2
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'spark' || p.type === 'dust' || p.type === 'fire') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // mild gravity
      } else if (p.type === 'ring') {
        p.radius += (p.maxRadius - p.radius) * 0.3;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life * 0.3), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'slash') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * p.life;
        ctx.beginPath();
        const start = p.facing > 0 ? p.angle - 0.7 : p.angle + 0.7;
        const end = p.facing > 0 ? p.angle + 0.7 : p.angle - 0.7;
        ctx.arc(p.x, p.y, p.radius, start, end, p.facing < 0);
        ctx.stroke();
      } else if (p.type === 'lightning') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        const midX = (p.x1 + p.x2) / 2 + (Math.random() - 0.5) * 20;
        const midY = (p.y1 + p.y2) / 2 + (Math.random() - 0.5) * 20;
        ctx.lineTo(midX, midY);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

const vfx = new VFXManager();

// Character Renderer supporting procedural body parts & animations
class CharacterRenderer {
  static drawFighter(ctx, fighter) {
    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    // Direction flip
    ctx.scale(fighter.facing, 1);

    // Invulnerability flashing
    if (fighter.invincibleFrames > 0 && Math.floor(fighter.invincibleFrames / 3) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Tumble rotation
    if (fighter.isTumbling) {
      ctx.rotate((fighter.tumbleAngle || 0) * fighter.facing);
    }

    // Shield rendering
    if (fighter.isShielding) {
      CharacterRenderer.drawShield(ctx, fighter);
    }

    // Draw Character Archetype Body
    const type = fighter.characterId;
    if (type === 'brawler') {
      CharacterRenderer.drawBrawler(ctx, fighter);
    } else if (type === 'space_ace') {
      CharacterRenderer.drawSpaceAce(ctx, fighter);
    } else if (type === 'swordmaster') {
      CharacterRenderer.drawSwordmaster(ctx, fighter);
    } else if (type === 'thunder_striker') {
      CharacterRenderer.drawThunderStriker(ctx, fighter);
    } else if (type === 'titan_dragon') {
      CharacterRenderer.drawTitanDragon(ctx, fighter);
    } else {
      CharacterRenderer.drawGeneric(ctx, fighter);
    }

    // Smash Attack Charging Aura
    if (fighter.isChargingSmash) {
      ctx.save();
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2 + Math.sin(Date.now() * 0.02) * 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.width * 0.7 + Math.random() * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dizzy / Shield Break Stars
    if (fighter.isDizzy) {
      CharacterRenderer.drawDizzyStars(ctx, fighter);
    }

    ctx.restore();
  }

  // Bubble Shield
  static drawShield(ctx, fighter) {
    ctx.save();
    const ratio = Math.max(0.2, fighter.shieldHp / 50);
    const radius = (fighter.width * 0.85) * ratio;
    const alpha = 0.35 + (1 - ratio) * 0.4;

    ctx.fillStyle = fighter.shieldColor || `rgba(255, 68, 68, ${alpha})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha + 0.3})`;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shimmer highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  static drawDizzyStars(ctx, fighter) {
    const t = Date.now() * 0.006;
    for (let i = 0; i < 3; i++) {
      const angle = t + (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 22;
      const y = -fighter.height / 2 - 12 + Math.sin(angle) * 6;
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mario Archetype: Red Cap, Blue Overalls, Mustache, Powerful Fists
  static drawBrawler(ctx, f) {
    const anim = f.animFrame || 0;
    const isAttacking = f.currentAttack !== null;
    const isAir = !f.isOnGround;

    // Body Overalls
    ctx.fillStyle = '#1e88e5'; // Blue
    ctx.fillRect(-12, -8, 24, 22);

    // Shirt & Sleeves
    ctx.fillStyle = '#e53935'; // Red
    ctx.fillRect(-14, -18, 28, 12);

    // Buttons
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffcc80'; // Skin
    ctx.beginPath();
    ctx.arc(0, -26, 12, 0, Math.PI * 2);
    ctx.fill();

    // Nose & Mustache
    ctx.fillStyle = '#ffb74d';
    ctx.beginPath();
    ctx.arc(6, -26, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2723'; // Dark brown
    ctx.fillRect(2, -24, 8, 4);

    // Red Cap
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(0, -32, 11, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-2, -32, 16, 5); // Visor

    // White Gloves / Hands
    ctx.fillStyle = '#ffffff';
    let rightArmX = 14, rightArmY = -10;
    let leftArmX = -12, leftArmY = -6;

    if (isAttacking && f.currentAttack?.name === 'fsmash') {
      rightArmX = 26; rightArmY = -12; // Big lunging punch
    } else if (isAttacking && f.currentAttack?.name === 'up_special') {
      rightArmX = 10; rightArmY = -34; // Rising coin punch
    } else if (isAttacking && f.currentAttack?.name === 'fair') {
      rightArmX = 18; rightArmY = 8; // Dunk forward air
    }

    ctx.beginPath();
    ctx.arc(rightArmX, rightArmY, 7, 0, Math.PI * 2);
    ctx.arc(leftArmX, leftArmY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Brown Boots
    ctx.fillStyle = '#4e342e';
    const legSwing = f.isOnGround && Math.abs(f.vx) > 0.5 ? Math.sin(anim * 0.4) * 8 : 0;
    ctx.fillRect(-14 + legSwing, 14, 11, 10);
    ctx.fillRect(3 - legSwing, 14, 11, 10);
  }

  // Fox McCloud Archetype: White/Orange Fur, Combat Jacket, Blaster Holster, Headset
  static drawSpaceAce(ctx, f) {
    const isAttacking = f.currentAttack !== null;
    const anim = f.animFrame || 0;

    // Bushy Tail
    ctx.fillStyle = '#fb8c00'; // Orange
    ctx.beginPath();
    ctx.ellipse(-18, 2, 12, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-24, 0, 6, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Flight Suit
    ctx.fillStyle = '#37474f'; // Dark jacket
    ctx.fillRect(-10, -14, 20, 24);
    ctx.fillStyle = '#eceff1'; // White combat vest
    ctx.fillRect(-7, -14, 14, 16);

    // Fox Head & Ears
    ctx.fillStyle = '#fb8c00';
    ctx.beginPath();
    ctx.arc(0, -24, 11, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(-7, -32); ctx.lineTo(-12, -42); ctx.lineTo(-2, -34); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, -34); ctx.lineTo(10, -42); ctx.lineTo(8, -32); ctx.fill();

    // Snout
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(8, -24, 3, 3); // Black nose tip

    // Headset
    ctx.fillStyle = '#00e676'; // Green visor/mic
    ctx.fillRect(2, -26, 6, 3);

    // Silver Boots
    ctx.fillStyle = '#90a4ae';
    const legSwing = f.isOnGround && Math.abs(f.vx) > 0.5 ? Math.sin(anim * 0.5) * 7 : 0;
    ctx.fillRect(-11 + legSwing, 10, 9, 14);
    ctx.fillRect(2 - legSwing, 10, 9, 14);

    // Blaster in hand if shooting
    if (isAttacking && f.currentAttack?.name === 'neutral_special') {
      ctx.fillStyle = '#424242';
      ctx.fillRect(10, -14, 16, 5);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(24, -15, 4, 7);
    }
  }

  // Marth Archetype: Blue Hair, Cape, Elegant Armor, Falchion Sword with Glowing Tip
  static drawSwordmaster(ctx, f) {
    const anim = f.animFrame || 0;
    const isAttacking = f.currentAttack !== null;

    // Cape behind
    ctx.fillStyle = '#0d47a1'; // Deep Navy Cape
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(-24 - Math.sin(anim * 0.2) * 6, 12);
    ctx.lineTo(-6, 8);
    ctx.fill();

    // Tunic & Breastplate
    ctx.fillStyle = '#1565c0'; // Blue tunic
    ctx.fillRect(-10, -12, 20, 22);
    ctx.fillStyle = '#ffd54f'; // Gold armor trims
    ctx.fillRect(-9, -12, 18, 6);
    ctx.fillRect(-7, -6, 14, 10);

    // Head & Blue Hair
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -24, 10, 0, Math.PI * 2);
    ctx.fill();
    // Flowing Blue Hair & Tiara
    ctx.fillStyle = '#1e88e5';
    ctx.beginPath();
    ctx.arc(-2, -27, 11, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = '#ffd54f'; // Tiara
    ctx.fillRect(-2, -30, 8, 3);

    // Slim Boots
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-10, 10, 8, 14);
    ctx.fillRect(2, 10, 8, 14);

    // The Iconic Sword (Falchion)
    ctx.save();
    let swordAngle = 0.4;
    let handX = 10, handY = -4;

    if (isAttacking) {
      if (f.currentAttack.name === 'fsmash') swordAngle = -0.3 + (f.attackFrame * 0.15);
      if (f.currentAttack.name === 'fair') swordAngle = -1.2 + (f.attackFrame * 0.2);
      if (f.currentAttack.name === 'up_special') swordAngle = -1.8;
      if (f.currentAttack.name === 'counter') swordAngle = 0.8;
    }

    ctx.translate(handX, handY);
    ctx.rotate(swordAngle);

    // Hilt
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(0, -3, 6, 6);
    // Blade
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(6, -2, 34, 4);
    // Tipper Sweetspot Glow
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(40, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Pikachu Archetype: Bright Yellow, Pointy Ears with Black Tips, Lightning Bolt Tail
  static drawThunderStriker(ctx, f) {
    const anim = f.animFrame || 0;

    // Lightning Bolt Tail
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-20, -4);
    ctx.lineTo(-16, -10);
    ctx.lineTo(-28, -18);
    ctx.lineTo(-22, -18);
    ctx.lineTo(-12, -8);
    ctx.fill();
    ctx.fillStyle = '#5d4037'; // Brown tail base
    ctx.fillRect(-12, 0, 5, 5);

    // Chubby Yellow Body
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.ellipse(0, -4, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brown Back Stripes
    ctx.fillStyle = '#795548';
    ctx.fillRect(-8, -12, 8, 3);
    ctx.fillRect(-8, -5, 8, 3);

    // Head & Cheeks
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.arc(4, -18, 12, 0, Math.PI * 2);
    ctx.fill();

    // Red Electric Cheeks
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(8, -15, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Cute Face
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(7, -21, 2.5, 0, Math.PI * 2); // Eye
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -22, 1, 0, Math.PI * 2); // Pupil highlight
    ctx.fill();

    // Pointy Ears with Black Tips
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(-2, -26); ctx.lineTo(-10, -42); ctx.lineTo(2, -30); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -26); ctx.lineTo(16, -42); ctx.lineTo(14, -28); ctx.fill();
    // Black Tips
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.moveTo(-7, -37); ctx.lineTo(-10, -42); ctx.lineTo(-3, -39); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, -37); ctx.lineTo(16, -42); ctx.lineTo(11, -39); ctx.fill();

    // Small Paws
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(-10, 10, 8, 6);
    ctx.fillRect(2, 10, 8, 6);
  }

  // Bowser Archetype: Spiked Green Shell, Horns, Huge Claws, Fire Blower
  static drawTitanDragon(ctx, f) {
    const anim = f.animFrame || 0;
    const isAttacking = f.currentAttack !== null;

    // Giant Spiked Shell on Back
    ctx.fillStyle = '#2e7d32'; // Forest green shell
    ctx.beginPath();
    ctx.ellipse(-12, -4, 22, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0'; // White shell rim
    ctx.lineWidth = 4;
    ctx.stroke();

    // Shell Spikes
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.moveTo(-28, -12); ctx.lineTo(-38, -16); ctx.lineTo(-24, -4); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, 4); ctx.lineTo(-36, 8); ctx.lineTo(-22, 16); ctx.fill();

    // Massive Scaly Body
    ctx.fillStyle = '#fbc02d'; // Golden yellow scales
    ctx.beginPath();
    ctx.ellipse(4, -2, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly Plating
    ctx.fillStyle = '#fff59d';
    ctx.fillRect(2, -14, 14, 20);

    // Horned Head
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(10, -24, 15, 0, Math.PI * 2);
    ctx.fill();
    // Snout
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(16, -24, 12, 12);
    // Red Hair Crest
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(2, -34); ctx.lineTo(8, -46); ctx.lineTo(14, -34); ctx.fill();
    // Bull Horns
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.moveTo(6, -32); ctx.lineTo(0, -44); ctx.lineTo(12, -36); ctx.fill();

    // Heavy Clawed Feet
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(-14, 16, 16, 12);
    ctx.fillRect(6, 16, 16, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(18, 22, 5, 6);
  }

  static drawGeneric(ctx, f) {
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(-f.width / 2, -f.height / 2, f.width, f.height);
  }
}
