// Player character management
import { CONFIG, ITEMS } from './config.js';
import { clamp } from './utils.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;

        // Stats
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER_MAX_HEALTH;
        this.stamina = CONFIG.PLAYER_MAX_STAMINA;
        this.maxStamina = CONFIG.PLAYER_MAX_STAMINA;

        // Movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = 0; // Radians, 0 = right
        this.isMoving = false;
        this.isRunning = false;

        // Inventory
        this.inventory = new Array(24).fill(null);
        this.quickbar = new Array(8).fill(null);
        this.selectedSlot = 0;

        // Discovered biomes for exploration quest
        this.discoveredBiomes = new Set();

        // Give starting items
        this.addItem('apple', 5);
        this.addItem('torch', 2);
    }

    // Add item to inventory
    addItem(itemId, amount = 1) {
        const itemDef = ITEMS[itemId];
        if (!itemDef) return false;

        // Try to stack with existing items
        if (itemDef.stackable) {
            // Check quickbar first
            for (let i = 0; i < this.quickbar.length; i++) {
                const slot = this.quickbar[i];
                if (slot && slot.id === itemId && slot.count < itemDef.maxStack) {
                    const canAdd = Math.min(amount, itemDef.maxStack - slot.count);
                    slot.count += canAdd;
                    amount -= canAdd;
                    if (amount <= 0) return true;
                }
            }

            // Check main inventory
            for (let i = 0; i < this.inventory.length; i++) {
                const slot = this.inventory[i];
                if (slot && slot.id === itemId && slot.count < itemDef.maxStack) {
                    const canAdd = Math.min(amount, itemDef.maxStack - slot.count);
                    slot.count += canAdd;
                    amount -= canAdd;
                    if (amount <= 0) return true;
                }
            }
        }

        // Add to empty slots
        while (amount > 0) {
            // Find empty slot in quickbar
            let slotIndex = this.quickbar.findIndex(s => s === null);
            let target = this.quickbar;

            if (slotIndex === -1) {
                // Find empty slot in inventory
                slotIndex = this.inventory.findIndex(s => s === null);
                target = this.inventory;
            }

            if (slotIndex === -1) {
                // Inventory full
                return false;
            }

            const addAmount = itemDef.stackable
                ? Math.min(amount, itemDef.maxStack)
                : 1;

            target[slotIndex] = {
                id: itemId,
                count: addAmount
            };

            amount -= addAmount;
        }

        return true;
    }

    // Remove item from inventory
    removeItem(itemId, amount = 1) {
        let remaining = amount;

        // Check quickbar first
        for (let i = 0; i < this.quickbar.length && remaining > 0; i++) {
            const slot = this.quickbar[i];
            if (slot && slot.id === itemId) {
                const toRemove = Math.min(remaining, slot.count);
                slot.count -= toRemove;
                remaining -= toRemove;
                if (slot.count <= 0) {
                    this.quickbar[i] = null;
                }
            }
        }

        // Check main inventory
        for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
            const slot = this.inventory[i];
            if (slot && slot.id === itemId) {
                const toRemove = Math.min(remaining, slot.count);
                slot.count -= toRemove;
                remaining -= toRemove;
                if (slot.count <= 0) {
                    this.inventory[i] = null;
                }
            }
        }

        return remaining === 0;
    }

    // Count items in inventory
    countItem(itemId) {
        let count = 0;

        for (const slot of this.quickbar) {
            if (slot && slot.id === itemId) {
                count += slot.count;
            }
        }

        for (const slot of this.inventory) {
            if (slot && slot.id === itemId) {
                count += slot.count;
            }
        }

        return count;
    }

    // Has item
    hasItem(itemId, amount = 1) {
        return this.countItem(itemId) >= amount;
    }

    // Get selected quickbar item
    getSelectedItem() {
        return this.quickbar[this.selectedSlot];
    }

    // Use selected item
    useSelectedItem() {
        const slot = this.quickbar[this.selectedSlot];
        if (!slot) return false;

        const itemDef = ITEMS[slot.id];
        if (!itemDef) return false;

        if (itemDef.consumable) {
            // Heal player
            if (itemDef.healAmount) {
                this.heal(itemDef.healAmount);
            }

            // Remove item
            slot.count--;
            if (slot.count <= 0) {
                this.quickbar[this.selectedSlot] = null;
            }

            return true;
        }

        return false;
    }

    // Heal player
    heal(amount) {
        this.health = clamp(this.health + amount, 0, this.maxHealth);
    }

    // Take damage
    takeDamage(amount) {
        this.health = clamp(this.health - amount, 0, this.maxHealth);
        return this.health <= 0;
    }

    // Update player state
    update(deltaTime, input, world) {
        // Handle movement
        let moveX = 0;
        let moveY = 0;

        if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) moveY -= 1;
        if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) moveY += 1;
        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) moveX -= 1;
        if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const len = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= len;
            moveY /= len;
        }

        this.isMoving = moveX !== 0 || moveY !== 0;
        this.isRunning = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');

        // Calculate speed
        let speed = CONFIG.PLAYER_SPEED;
        if (this.isRunning && this.stamina > 0) {
            speed *= CONFIG.PLAYER_RUN_MULTIPLIER;
            this.stamina -= CONFIG.STAMINA_DRAIN_RATE * deltaTime;
        } else {
            this.isRunning = false;
        }

        // Regenerate stamina when not running
        if (!this.isRunning) {
            this.stamina = clamp(
                this.stamina + CONFIG.STAMINA_REGEN_RATE * deltaTime,
                0,
                this.maxStamina
            );
        }

        // Regenerate health slowly
        if (this.health < this.maxHealth) {
            this.health = clamp(
                this.health + CONFIG.HEALTH_REGEN_RATE * deltaTime,
                0,
                this.maxHealth
            );
        }

        // Apply movement with collision
        if (this.isMoving) {
            const newX = this.x + moveX * speed * deltaTime;
            const newY = this.y + moveY * speed * deltaTime;

            // Check collision
            if (world.isWalkable(newX, this.y)) {
                this.x = newX;
            }
            if (world.isWalkable(this.x, newY)) {
                this.y = newY;
            }

            // Update direction
            this.direction = Math.atan2(moveY, moveX);

            // Track biome discovery
            const currentBiome = world.getBiome(this.x, this.y);
            this.discoveredBiomes.add(currentBiome);
        }

        this.stamina = clamp(this.stamina, 0, this.maxStamina);
    }

    // Get player bounds for collision
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}
