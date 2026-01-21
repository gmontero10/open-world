// Input Management System

export class InputManager {
    constructor() {
        this.keys = new Map();
        this.keysJustPressed = new Set();
        this.keysJustReleased = new Set();

        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.mouseJustClicked = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (!this.keys.get(e.code)) {
                this.keysJustPressed.add(e.code);
            }
            this.keys.set(e.code, true);

            // Prevent default for game keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyI', 'KeyC', 'KeyQ', 'KeyM'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            this.keysJustReleased.add(e.code);
        });

        // Mouse events
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseJustClicked = true;
        });

        window.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
        });

        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle window blur (clear all keys)
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }

    // Check if key is currently held down
    isKeyDown(keyCode) {
        return this.keys.get(keyCode) === true;
    }

    // Check if key was just pressed this frame
    isKeyJustPressed(keyCode) {
        return this.keysJustPressed.has(keyCode);
    }

    // Check if key was just released this frame
    isKeyJustReleased(keyCode) {
        return this.keysJustReleased.has(keyCode);
    }

    // Get mouse position
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }

    // Check if mouse is down
    isMouseDown() {
        return this.mouseDown;
    }

    // Check if mouse was just clicked
    wasMouseJustClicked() {
        return this.mouseJustClicked;
    }

    // Clear per-frame state (call at end of each frame)
    update() {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouseJustClicked = false;
    }

    // Get movement vector from WASD/Arrow keys
    getMovementVector() {
        let x = 0;
        let y = 0;

        if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) y -= 1;
        if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) y += 1;
        if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;
        if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;

        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }

        return { x, y };
    }

    // Check if running (shift held)
    isRunning() {
        return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
    }
}
