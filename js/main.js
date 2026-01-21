// Main Game Entry Point
import { CONFIG } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.minimapCanvas = document.getElementById('minimap');

        // Initialize systems
        this.input = new InputManager();
        this.renderer = new Renderer(this.canvas);
        this.ui = new UIManager(this);

        // Game state
        this.running = false;
        this.lastTime = 0;
        this.gameTime = 6; // Start at 6:00 AM

        // World and player (initialized on start)
        this.world = null;
        this.player = null;

        // Interaction state
        this.nearbyInteractable = null;
    }

    // Start the game
    start() {
        // Generate world with random seed
        const seed = Math.floor(Math.random() * 1000000);
        this.world = new World(seed);

        // Create player at center of world
        const startX = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;
        const startY = CONFIG.WORLD_SIZE * CONFIG.TILE_SIZE / 2;

        // Find a walkable starting position
        let playerX = startX;
        let playerY = startY;
        for (let i = 0; i < 100; i++) {
            if (this.world.isWalkable(playerX, playerY)) break;
            playerX += (Math.random() - 0.5) * 100;
            playerY += (Math.random() - 0.5) * 100;
        }

        this.player = new Player(playerX, playerY);

        // Spawn NPCs and animals
        this.world.spawnNPCs(playerX, playerY);
        this.world.spawnAnimals(playerX, playerY);

        // Pre-generate chunks around player
        this.preGenerateChunks();

        // Start game loop
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));

        // Start with a quest
        this.ui.startQuest({
            id: 'welcome',
            title: 'Welcome to the World',
            description: 'Explore the world and gather 5 pieces of wood.',
            objective: { type: 'collect', item: 'wood', amount: 5 },
            reward: { coin: 10, apple: 3 }
        });
    }

    // Pre-generate chunks around player
    preGenerateChunks() {
        const chunkX = Math.floor(this.player.x / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE));
        const chunkY = Math.floor(this.player.y / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE));

        for (let cy = chunkY - CONFIG.RENDER_DISTANCE; cy <= chunkY + CONFIG.RENDER_DISTANCE; cy++) {
            for (let cx = chunkX - CONFIG.RENDER_DISTANCE; cx <= chunkX + CONFIG.RENDER_DISTANCE; cx++) {
                this.world.getChunk(cx, cy);
            }
        }
    }

    // Main game loop
    gameLoop(currentTime) {
        if (!this.running) return;

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        // Clear input state
        this.input.update();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Update game state
    update(deltaTime) {
        // Update game time (day/night cycle)
        this.gameTime += deltaTime / CONFIG.DAY_LENGTH * 24;
        if (this.gameTime >= 24) this.gameTime -= 24;

        // Handle input when no UI panels are open
        if (!this.ui.isAnyPanelOpen()) {
            // Update player
            this.player.update(deltaTime, this.input, this.world);

            // Check for interactions
            this.checkInteractions();

            // Handle interaction key
            if (this.input.isKeyJustPressed('KeyE')) {
                this.interact();
            }

            // Use item (left click or space)
            if (this.input.isKeyJustPressed('Space')) {
                this.player.useSelectedItem();
                this.ui.updateQuickbar(this.player);
            }

            // Quickbar selection with number keys
            for (let i = 0; i < 8; i++) {
                if (this.input.isKeyJustPressed(`Digit${i + 1}`)) {
                    this.player.selectedSlot = i;
                    this.ui.updateQuickbar(this.player);
                }
            }
        }

        // Handle UI toggles
        if (this.input.isKeyJustPressed('KeyI')) {
            this.ui.toggleInventory();
        }

        if (this.input.isKeyJustPressed('KeyC')) {
            this.ui.toggleCrafting();
        }

        if (this.input.isKeyJustPressed('KeyQ')) {
            this.ui.toggleQuests();
        }

        if (this.input.isKeyJustPressed('Escape')) {
            this.ui.closeAllPanels();
        }

        // Advance dialog with space
        if (this.ui.dialogActive && this.input.isKeyJustPressed('Space')) {
            this.ui.advanceDialog();
        }

        // Update world (NPCs, animals)
        this.world.update(deltaTime, this.player.x, this.player.y);

        // Update camera
        this.renderer.updateCamera(this.player.x, this.player.y);

        // Update time of day lighting
        this.renderer.setTimeOfDay(this.gameTime);

        // Update UI
        this.ui.update(this.player, this.gameTime);

        // Check quest progress
        this.ui.checkQuestProgress();
    }

    // Check for nearby interactable objects
    checkInteractions() {
        const range = CONFIG.INTERACTION_RANGE;

        // Check NPCs
        const nearbyNPCs = this.world.getNPCsNear(this.player.x, this.player.y, range);
        if (nearbyNPCs.length > 0) {
            this.nearbyInteractable = { type: 'npc', entity: nearbyNPCs[0] };
            this.ui.showInteractionPrompt(`Press E to talk to ${this.ui.getNPCName(nearbyNPCs[0])}`);
            return;
        }

        // Check harvestable objects
        const nearbyObjects = this.world.getObjectsNear(this.player.x, this.player.y, range);
        const harvestable = nearbyObjects.find(o => o.harvestable);
        if (harvestable) {
            const names = {
                tree: 'tree',
                rock: 'rock',
                flower: 'flower',
                mushroom: 'mushroom',
                bush: 'berry bush'
            };
            this.nearbyInteractable = { type: 'harvest', entity: harvestable };
            this.ui.showInteractionPrompt(`Press E to harvest ${names[harvestable.type] || 'object'}`);
            return;
        }

        // Check buildings
        const nearbyBuildings = this.world.getBuildingsNear(this.player.x, this.player.y, range);
        if (nearbyBuildings.length > 0 && nearbyBuildings[0].interactable) {
            this.nearbyInteractable = { type: 'building', entity: nearbyBuildings[0] };
            this.ui.showInteractionPrompt(`Press E to enter ${nearbyBuildings[0].type}`);
            return;
        }

        // Nothing nearby
        this.nearbyInteractable = null;
        this.ui.hideInteractionPrompt();
    }

    // Perform interaction
    interact() {
        if (!this.nearbyInteractable) return;

        switch (this.nearbyInteractable.type) {
            case 'npc':
                this.ui.startNPCDialog(this.nearbyInteractable.entity);
                break;

            case 'harvest':
                const result = this.world.harvestObject(this.nearbyInteractable.entity.id);
                if (result) {
                    const added = this.player.addItem(result.resource, result.amount);
                    if (added) {
                        this.ui.showNotification(`+${result.amount} ${result.resource}`);
                        this.ui.updateQuickbar(this.player);
                        this.ui.checkQuestProgress();
                    } else {
                        this.ui.showNotification('Inventory full!');
                    }
                }
                break;

            case 'building':
                const building = this.nearbyInteractable.entity;
                if (building.type === 'shop') {
                    this.ui.showNotification('Shop is not yet implemented.');
                } else if (building.type === 'inn') {
                    // Rest at inn - restore health/stamina
                    this.player.health = this.player.maxHealth;
                    this.player.stamina = this.player.maxStamina;
                    this.ui.showNotification('You rested at the inn. Fully restored!');
                } else if (building.type === 'well') {
                    // Drink from well
                    this.player.stamina = this.player.maxStamina;
                    this.ui.showNotification('You drank from the well. Stamina restored!');
                } else {
                    this.ui.showNotification(`You looked inside the ${building.type}.`);
                }
                break;
        }
    }

    // Render game
    render() {
        this.renderer.clear();
        this.renderer.renderWorld(this.world, this.player, 0.016);
        this.renderer.renderMinimap(this.minimapCanvas, this.world, this.player);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
