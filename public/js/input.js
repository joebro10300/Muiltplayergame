// Comprehensive Input System for Keyboard, Gamepad (Xbox/PlayStation/Switch), and Touch
class InputHandler {
  constructor() {
    this.keys = {};
    this.keyPressTime = {};
    this.gamepads = {};
    this.touchState = {};

    // Standard player keybindings
    this.bindings = {
      p1: {
        left: ['KeyA', 'ArrowLeft'],
        right: ['KeyD', 'ArrowRight'],
        up: ['KeyW', 'ArrowUp'],
        down: ['KeyS', 'ArrowDown'],
        jump: ['Space', 'KeyW', 'ArrowUp'],
        attack: ['KeyJ', 'KeyZ'],
        special: ['KeyK', 'KeyX'],
        shield: ['KeyL', 'KeyC'],
        grab: ['KeyI', 'KeyV'],
        smashModifier: ['KeyU', 'ShiftLeft']
      },
      p2: {
        left: ['ArrowLeft', 'Numpad4'],
        right: ['ArrowRight', 'Numpad6'],
        up: ['ArrowUp', 'Numpad8'],
        down: ['ArrowDown', 'Numpad5'],
        jump: ['Numpad0', 'ArrowUp', 'KeyO'],
        attack: ['Numpad1', 'KeyB'],
        special: ['Numpad2', 'KeyN'],
        shield: ['Numpad3', 'KeyM'],
        grab: ['NumpadEnter', 'KeyH'],
        smashModifier: ['NumpadPlus', 'ShiftRight']
      }
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this.keyPressTime[e.code] = performance.now();
      }
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        // Prevent scroll
        e.preventDefault();
      }
      if (sounds.ctx && sounds.ctx.state === 'suspended') {
        sounds.resume();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      delete this.keyPressTime[e.code];
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}`);
      this.gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`Gamepad disconnected at index ${e.gamepad.index}`);
      delete this.gamepads[e.gamepad.index];
    });
  }

  // Poll current gamepads
  pollGamepads() {
    if (!navigator.getGamepads) return;
    const gpList = navigator.getGamepads();
    for (let i = 0; i < gpList.length; i++) {
      if (gpList[i]) {
        this.gamepads[gpList[i].index] = gpList[i];
      }
    }
  }

  // Trigger controller haptic rumble
  rumble(gamepadIndex, intensity = 0.5, duration = 150) {
    const gp = this.gamepads[gamepadIndex];
    if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration,
        weakMagnitude: intensity * 0.7,
        strongMagnitude: intensity
      }).catch(() => {});
    }
  }

  // Generate standardized input frame object
  getInput(playerIndex = 0) {
    this.pollGamepads();
    const isP1 = playerIndex === 0;
    const pKeys = isP1 ? this.bindings.p1 : this.bindings.p2;

    const input = {
      x: 0,
      y: 0,
      jump: false,
      attack: false,
      special: false,
      shield: false,
      grab: false,
      smash: false,
      cStickX: 0,
      cStickY: 0
    };

    // Keyboard checks
    const isDown = (arr) => arr.some(code => this.keys[code]);

    if (isDown(pKeys.left)) input.x -= 1;
    if (isDown(pKeys.right)) input.x += 1;
    if (isDown(pKeys.up)) input.y -= 1;
    if (isDown(pKeys.down)) input.y += 1;

    input.jump = isDown(pKeys.jump);
    input.attack = isDown(pKeys.attack);
    input.special = isDown(pKeys.special);
    input.shield = isDown(pKeys.shield);
    input.grab = isDown(pKeys.grab);
    input.smash = isDown(pKeys.smashModifier);

    // Gamepad checks
    const gp = this.gamepads[playerIndex];
    if (gp) {
      const deadzone = 0.2;
      const stickX = gp.axes[0] || 0;
      const stickY = gp.axes[1] || 0;

      if (Math.abs(stickX) > deadzone) input.x = stickX;
      if (Math.abs(stickY) > deadzone) input.y = stickY;

      // D-Pad
      if (gp.buttons[14]?.pressed) input.x = -1;
      if (gp.buttons[15]?.pressed) input.x = 1;
      if (gp.buttons[12]?.pressed) input.y = -1;
      if (gp.buttons[13]?.pressed) input.y = 1;

      // Standard buttons: A=0, B=1, X=2, Y=3
      if (gp.buttons[0]?.pressed) input.attack = true;
      if (gp.buttons[1]?.pressed) input.special = true;
      if (gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) input.jump = true;

      // Bumpers & Triggers: LB=4, RB=5, LT=6, RT=7
      if (gp.buttons[4]?.pressed || gp.buttons[6]?.pressed || (gp.buttons[6]?.value > 0.3)) {
        input.shield = true;
      }
      if (gp.buttons[5]?.pressed || gp.buttons[7]?.pressed || (gp.buttons[7]?.value > 0.3)) {
        input.grab = true;
      }

      // C-Stick (Right analog stick for direct Smash Attacks)
      const cX = gp.axes[2] || 0;
      const cY = gp.axes[3] || 0;
      if (Math.abs(cX) > 0.5 || Math.abs(cY) > 0.5) {
        input.cStickX = cX;
        input.cStickY = cY;
        input.smash = true;
        input.attack = true;
      }
    }

    // Touch controls if active
    if (this.touchState.active && isP1) {
      if (this.touchState.stickX) input.x = this.touchState.stickX;
      if (this.touchState.stickY) input.y = this.touchState.stickY;
      if (this.touchState.jump) input.jump = true;
      if (this.touchState.attack) input.attack = true;
      if (this.touchState.special) input.special = true;
      if (this.touchState.shield) input.shield = true;
      if (this.touchState.grab) input.grab = true;
      if (this.touchState.smash) input.smash = true;
    }

    return input;
  }
}

const inputManager = new InputHandler();
