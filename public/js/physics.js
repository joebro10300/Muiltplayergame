// Super Smash Bros Physics Engine: Knockback Formula, DI, Hitlag, Hitstun, Shields, and Ledges

class PhysicsEngine {
  constructor() {
    this.gravity = 0.55;
    this.terminalVelocity = 14;
    this.groundFriction = 0.84;
    this.airResistance = 0.985;
  }

  // Authentic Smash Ultimate Knockback Formula
  calculateKnockback(targetDamage, moveDamage, targetWeight, knockbackGrowth, baseKnockback, isSmashCharged = 1.0) {
    const finalDamage = moveDamage * isSmashCharged;
    const p = targetDamage + finalDamage;
    const w = targetWeight;
    const s = knockbackGrowth / 100;
    const b = baseKnockback;

    // Standard platform fighter formula
    const base = (((p / 10) + (p * finalDamage / 20)) * (200 / (w + 100)) * 1.4) + 18;
    const knockback = (base * s) + b;
    return { knockback, finalDamage };
  }

  // Calculate hitstun duration from knockback value
  calculateHitstun(knockback) {
    return Math.max(8, Math.floor(knockback * 0.4));
  }

  // Calculate hitlag freeze frames for attacker & defender
  calculateHitlag(damage, multiplier = 1.0) {
    return Math.max(3, Math.floor((damage * 0.65 + 3) * multiplier));
  }

  // Apply Directional Influence (DI) to launch angle
  applyDI(launchAngleDeg, diX, diY) {
    if (Math.abs(diX) < 0.2 && Math.abs(diY) < 0.2) {
      return (launchAngleDeg * Math.PI) / 180;
    }

    const baseRad = (launchAngleDeg * Math.PI) / 180;
    const diAngle = Math.atan2(diY, diX);

    // Calculate angular difference
    let angleDiff = diAngle - baseRad;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Perpendicular DI has maximum effect (up to 18 degrees = ~0.314 rad)
    const maxDiRad = 0.314;
    const diInfluence = Math.sin(angleDiff) * maxDiRad;

    return baseRad + diInfluence;
  }

  // AABB Hitbox vs Hurtbox collision test with rotation offset
  checkHitboxCollision(hitbox, hurtbox) {
    return (
      hitbox.x - hitbox.radius < hurtbox.x + hurtbox.width / 2 &&
      hitbox.x + hitbox.radius > hurtbox.x - hurtbox.width / 2 &&
      hitbox.y - hitbox.radius < hurtbox.y + hurtbox.height / 2 &&
      hitbox.y + hitbox.radius > hurtbox.y - hurtbox.height / 2
    );
  }

  // Circle vs Circle collision
  checkCircleCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const distSq = dx * dx + dy * dy;
    const radSum = c1.radius + c2.radius;
    return distSq < radSum * radSum;
  }

  // Platform collision resolution
  resolvePlatformCollisions(fighter, platforms) {
    fighter.isOnGround = false;
    fighter.currentPlatform = null;

    // Feet position
    const feetY = fighter.y + fighter.height / 2;
    const prevFeetY = fighter.prevY + fighter.height / 2;
    const halfWidth = fighter.width / 2 - 4; // slight inset for edge stability

    for (const plat of platforms) {
      // Check horizontal overlap
      if (fighter.x + halfWidth > plat.x && fighter.x - halfWidth < plat.x + plat.width) {
        if (plat.isSemiSolid) {
          // Drop-through platform: only land if falling from above and not dropping through
          if (fighter.isDroppingThrough) continue;
          if (prevFeetY <= plat.y + 2 && feetY >= plat.y && fighter.vy >= 0) {
            fighter.y = plat.y - fighter.height / 2;
            fighter.vy = 0;
            fighter.isOnGround = true;
            fighter.currentPlatform = plat;
            fighter.jumpsLeft = fighter.maxJumps;
            fighter.hasAirDodge = true;
            fighter.isHelpless = false;
            break;
          }
        } else {
          // Solid ground platform (main stage floor & walls)
          // Vertical landing
          if (prevFeetY <= plat.y + 6 && feetY >= plat.y && fighter.vy >= 0) {
            fighter.y = plat.y - fighter.height / 2;
            fighter.vy = 0;
            fighter.isOnGround = true;
            fighter.currentPlatform = plat;
            fighter.jumpsLeft = fighter.maxJumps;
            fighter.hasAirDodge = true;
            fighter.isHelpless = false;
            break;
          }

          // Ceiling bounce
          const headY = fighter.y - fighter.height / 2;
          const prevHeadY = fighter.prevY - fighter.height / 2;
          if (prevHeadY >= plat.y + plat.height && headY <= plat.y + plat.height && fighter.vy < 0) {
            fighter.y = plat.y + plat.height + fighter.height / 2;
            fighter.vy = -fighter.vy * 0.4;
          }

          // Wall collision
          if (feetY > plat.y + 6 && headY < plat.y + plat.height) {
            // Left wall
            if (fighter.x + halfWidth >= plat.x && fighter.prevX + halfWidth <= plat.x) {
              fighter.x = plat.x - halfWidth;
              fighter.vx = 0;
            }
            // Right wall
            if (fighter.x - halfWidth <= plat.x + plat.width && fighter.prevX - halfWidth >= plat.x + plat.width) {
              fighter.x = plat.x + plat.width + halfWidth;
              fighter.vx = 0;
            }
          }
        }
      }
    }
  }

  // Check and snap to ledge
  checkLedgeGrab(fighter, stage) {
    if (fighter.isOnGround || fighter.isHelplessDrop || fighter.ledgeCooldown > 0 || fighter.isHurt) {
      return false;
    }

    const grabRadius = 28;
    const handX = fighter.x + (fighter.facing * (fighter.width / 2));
    const handY = fighter.y - 10;

    for (const ledge of stage.ledges) {
      const dx = handX - ledge.x;
      const dy = handY - ledge.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Snap if in radius and falling or moving toward ledge
      if (dist < grabRadius && fighter.vy >= -4) {
        fighter.isHangingOnLedge = true;
        fighter.hangingLedge = ledge;
        fighter.x = ledge.x + (ledge.facing * -12);
        fighter.y = ledge.y + fighter.height / 2 - 8;
        fighter.vx = 0;
        fighter.vy = 0;
        fighter.facing = ledge.facing;
        fighter.invincibleFrames = 35; // Ledge intangibility
        fighter.ledgeHangTimer = 180;  // Auto-drop after 3 seconds
        fighter.jumpsLeft = fighter.maxJumps;
        fighter.hasAirDodge = true;
        fighter.isHelpless = false;
        sounds.ledgeGrab();
        return true;
      }
    }
    return false;
  }
}

const physics = new PhysicsEngine();
