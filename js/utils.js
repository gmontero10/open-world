// Utility functions and noise generation

// Seeded random number generator
export class SeededRandom {
    constructor(seed = 12345) {
        this.seed = seed;
        this.m = 2147483647;
        this.a = 16807;
        this.state = seed;
    }

    next() {
        this.state = (this.a * this.state) % this.m;
        return this.state / this.m;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    reset() {
        this.state = this.seed;
    }

    setSeed(seed) {
        this.seed = seed;
        this.state = seed;
    }
}

// Simplex-like noise for terrain generation
export class SimplexNoise {
    constructor(seed = 12345) {
        this.rng = new SeededRandom(seed);
        this.permutation = this.buildPermutation();
        this.gradients = this.buildGradients();
    }

    buildPermutation() {
        const perm = [];
        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }
        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        // Duplicate
        return [...perm, ...perm];
    }

    buildGradients() {
        const grads = [];
        for (let i = 0; i < 256; i++) {
            const angle = this.rng.next() * Math.PI * 2;
            grads.push({ x: Math.cos(angle), y: Math.sin(angle) });
        }
        return grads;
    }

    dot(g, x, y) {
        return g.x * x + g.y * y;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = this.fade(xf);
        const v = this.fade(yf);

        const aa = this.permutation[X] + Y;
        const ab = this.permutation[X] + Y + 1;
        const ba = this.permutation[X + 1] + Y;
        const bb = this.permutation[X + 1] + Y + 1;

        const gradAA = this.gradients[this.permutation[aa] & 255];
        const gradBA = this.gradients[this.permutation[ba] & 255];
        const gradAB = this.gradients[this.permutation[ab] & 255];
        const gradBB = this.gradients[this.permutation[bb] & 255];

        const x1 = this.lerp(
            this.dot(gradAA, xf, yf),
            this.dot(gradBA, xf - 1, yf),
            u
        );
        const x2 = this.lerp(
            this.dot(gradAB, xf, yf - 1),
            this.dot(gradBB, xf - 1, yf - 1),
            u
        );

        return this.lerp(x1, x2, v);
    }

    // Fractal Brownian Motion for more natural terrain
    fbm(x, y, octaves = 4, lacunarity = 2, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise2D(x * frequency, y * frequency);
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return value / maxValue;
    }
}

// Distance calculation
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Clamp value between min and max
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Linear interpolation
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Map a value from one range to another
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Check if point is inside rectangle
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Check collision between two rectangles
export function rectCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
}

// Get random element from array
export function randomChoice(array, rng = null) {
    const index = rng
        ? Math.floor(rng.next() * array.length)
        : Math.floor(Math.random() * array.length);
    return array[index];
}

// Shuffle array (Fisher-Yates)
export function shuffleArray(array, rng = null) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = rng
            ? Math.floor(rng.next() * (i + 1))
            : Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Format time (game hours to HH:MM)
export function formatGameTime(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Ease functions
export const ease = {
    linear: t => t,
    quadIn: t => t * t,
    quadOut: t => t * (2 - t),
    quadInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    cubicIn: t => t * t * t,
    cubicOut: t => (--t) * t * t + 1,
    cubicInOut: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Generate unique ID
let idCounter = 0;
export function generateId() {
    return `entity_${Date.now()}_${++idCounter}`;
}

// Color utilities
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

export function lerpColor(color1, color2, t) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    return rgbToHex(
        lerp(c1.r, c2.r, t),
        lerp(c1.g, c2.g, t),
        lerp(c1.b, c2.b, t)
    );
}
