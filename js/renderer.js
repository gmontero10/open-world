// Game rendering system
import { CONFIG, ITEMS } from './config.js';
import { lerpColor, clamp } from './utils.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        // Camera
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraSmoothing = 0.1;

        // Time of day lighting
        this.ambientLight = 1.0;
        this.ambientColor = '#FFFFFF';

        // Animation
        this.animTime = 0;

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Update camera to follow target
    updateCamera(targetX, targetY) {
        this.cameraX += (targetX - this.cameraX) * this.cameraSmoothing;
        this.cameraY += (targetY - this.cameraY) * this.cameraSmoothing;
    }

    // Set time of day lighting
    setTimeOfDay(hour) {
        // Calculate ambient light based on time
        if (hour >= CONFIG.DAY_START && hour < CONFIG.DUSK_START) {
            // Day
            this.ambientLight = 1.0;
            this.ambientColor = '#FFFAF0';
        } else if (hour >= CONFIG.DUSK_START && hour < CONFIG.NIGHT_START) {
            // Dusk
            const t = (hour - CONFIG.DUSK_START) / (CONFIG.NIGHT_START - CONFIG.DUSK_START);
            this.ambientLight = 1.0 - t * 0.6;
            this.ambientColor = lerpColor('#FFFAF0', '#1a1a40', t);
        } else if (hour >= CONFIG.NIGHT_START || hour < CONFIG.DAWN_START) {
            // Night
            this.ambientLight = 0.4;
            this.ambientColor = '#1a1a40';
        } else if (hour >= CONFIG.DAWN_START && hour < CONFIG.DAY_START) {
            // Dawn
            const t = (hour - CONFIG.DAWN_START) / (CONFIG.DAY_START - CONFIG.DAWN_START);
            this.ambientLight = 0.4 + t * 0.6;
            this.ambientColor = lerpColor('#1a1a40', '#FFFAF0', t);
        }
    }

    // Clear screen
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // World to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.cameraX + this.canvas.width / 2,
            y: worldY - this.cameraY + this.canvas.height / 2
        };
    }

    // Screen to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.cameraX - this.canvas.width / 2,
            y: screenY + this.cameraY - this.canvas.height / 2
        };
    }

    // Render the world
    renderWorld(world, player, deltaTime) {
        this.animTime += deltaTime;

        const ctx = this.ctx;

        // Calculate visible area
        const viewLeft = this.cameraX - this.canvas.width / 2;
        const viewTop = this.cameraY - this.canvas.height / 2;
        const viewRight = viewLeft + this.canvas.width;
        const viewBottom = viewTop + this.canvas.height;

        // Calculate visible chunks
        const chunkPixels = CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;
        const startChunkX = Math.floor(viewLeft / chunkPixels) - 1;
        const startChunkY = Math.floor(viewTop / chunkPixels) - 1;
        const endChunkX = Math.ceil(viewRight / chunkPixels) + 1;
        const endChunkY = Math.ceil(viewBottom / chunkPixels) + 1;

        // Render terrain chunks
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
            for (let cx = startChunkX; cx <= endChunkX; cx++) {
                const chunk = world.getChunk(cx, cy);
                this.renderChunk(chunk, viewLeft, viewTop);
            }
        }

        // Collect all objects from visible chunks
        const objects = [];
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
            for (let cx = startChunkX; cx <= endChunkX; cx++) {
                const chunk = world.chunks.get(world.getChunkKey(cx, cy));
                if (chunk) {
                    objects.push(...chunk.objects);
                }
            }
        }

        // Add buildings, NPCs, animals
        objects.push(...world.buildings.map(b => ({ ...b, sortY: b.y + b.height })));
        objects.push(...world.npcs.map(n => ({ ...n, sortY: n.y })));
        objects.push(...world.animals.map(a => ({ ...a, sortY: a.y })));
        objects.push({ isPlayer: true, x: player.x, y: player.y, sortY: player.y });

        // Sort by Y position for proper depth
        objects.sort((a, b) => (a.sortY || a.y) - (b.sortY || b.y));

        // Render all objects
        for (const obj of objects) {
            if (obj.isPlayer) {
                this.renderPlayer(player);
            } else if (obj.type === 'tree') {
                this.renderTree(obj);
            } else if (obj.type === 'rock') {
                this.renderRock(obj);
            } else if (obj.type === 'flower') {
                this.renderFlower(obj);
            } else if (obj.type === 'mushroom') {
                this.renderMushroom(obj);
            } else if (obj.type === 'bush') {
                this.renderBush(obj);
            } else if (obj.type === 'cactus') {
                this.renderCactus(obj);
            } else if (obj.type === 'house' || obj.type === 'shop' || obj.type === 'inn' || obj.type === 'well') {
                this.renderBuilding(obj);
            } else if (obj.type === 'villager' || obj.type === 'merchant' || obj.type === 'elder' || obj.type === 'guard' || obj.type === 'wanderer') {
                this.renderNPC(obj);
            } else if (obj.type === 'rabbit' || obj.type === 'deer' || obj.type === 'bird' || obj.type === 'fish') {
                this.renderAnimal(obj);
            }
        }

        // Apply day/night overlay
        this.applyLighting();
    }

    // Render a terrain chunk
    renderChunk(chunk, viewLeft, viewTop) {
        const ctx = this.ctx;
        const tileSize = CONFIG.TILE_SIZE;

        for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
            for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
                const tile = chunk.tiles[ty][tx];
                const worldX = chunk.x * CONFIG.CHUNK_SIZE * tileSize + tx * tileSize;
                const worldY = chunk.y * CONFIG.CHUNK_SIZE * tileSize + ty * tileSize;

                const screen = this.worldToScreen(worldX, worldY);

                // Skip if off screen
                if (screen.x > this.canvas.width || screen.x + tileSize < 0 ||
                    screen.y > this.canvas.height || screen.y + tileSize < 0) {
                    continue;
                }

                ctx.fillStyle = tile.color;
                ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), tileSize + 1, tileSize + 1);

                // Water animation
                if (tile.biome === 'water') {
                    const wave = Math.sin(this.animTime * 2 + worldX * 0.05 + worldY * 0.05) * 0.1;
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + wave * 0.1})`;
                    ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), tileSize + 1, tileSize + 1);
                }
            }
        }
    }

    // Render player
    renderPlayer(player) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(player.x, player.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + 10, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 5, 12, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 20, 8, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        const dirX = Math.cos(player.direction) * 15;
        const dirY = Math.sin(player.direction) * 15;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - 5);
        ctx.lineTo(screen.x + dirX, screen.y - 5 + dirY);
        ctx.stroke();

        // Running effect
        if (player.isRunning && player.isMoving) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            for (let i = 0; i < 3; i++) {
                const offset = (this.animTime * 5 + i) % 1;
                ctx.beginPath();
                ctx.arc(
                    screen.x - dirX * offset * 2,
                    screen.y + 5 - dirY * offset * 2,
                    3 * (1 - offset),
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    }

    // Render tree
    renderTree(tree) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(tree.x, tree.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screen.x - 5, screen.y - 40, 10, 45);

        // Leaves
        if (tree.treeType === 'pine') {
            // Pine tree (triangle)
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - 70);
            ctx.lineTo(screen.x - 25, screen.y - 20);
            ctx.lineTo(screen.x + 25, screen.y - 20);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#1B5E20';
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - 55);
            ctx.lineTo(screen.x - 20, screen.y - 15);
            ctx.lineTo(screen.x + 20, screen.y - 15);
            ctx.closePath();
            ctx.fill();
        } else {
            // Oak tree (round)
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 50, 25, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(screen.x - 10, screen.y - 55, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(screen.x + 12, screen.y - 48, 18, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Render rock
    renderRock(rock) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(rock.x, rock.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + 5, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(screen.x - 15, screen.y);
        ctx.lineTo(screen.x - 10, screen.y - 18);
        ctx.lineTo(screen.x + 5, screen.y - 20);
        ctx.lineTo(screen.x + 15, screen.y - 10);
        ctx.lineTo(screen.x + 12, screen.y + 5);
        ctx.lineTo(screen.x - 12, screen.y + 5);
        ctx.closePath();
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#A0A0A0';
        ctx.beginPath();
        ctx.moveTo(screen.x - 8, screen.y - 5);
        ctx.lineTo(screen.x - 5, screen.y - 15);
        ctx.lineTo(screen.x + 3, screen.y - 12);
        ctx.lineTo(screen.x, screen.y - 3);
        ctx.closePath();
        ctx.fill();

        // Gem sparkle
        if (rock.resource === 'gem') {
            const sparkle = Math.sin(this.animTime * 4) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(138, 43, 226, ${sparkle})`;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 10, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Render flower
    renderFlower(flower) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(flower.x, flower.y);

        if (!flower.harvestable) {
            // Harvested - show small stub
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screen.x - 1, screen.y - 3, 2, 5);
            return;
        }

        // Stem
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x, screen.y - 15);
        ctx.stroke();

        // Petals
        const colors = ['#FF69B4', '#FFB6C1', '#FF1493', '#FFC0CB'];
        const color = colors[Math.floor(flower.x) % colors.length];
        ctx.fillStyle = color;

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + this.animTime * 0.5;
            const px = screen.x + Math.cos(angle) * 6;
            const py = screen.y - 15 + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 15, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render mushroom
    renderMushroom(mushroom) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(mushroom.x, mushroom.y);

        if (!mushroom.harvestable) return;

        // Stem
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(screen.x - 3, screen.y - 8, 6, 10);

        // Cap
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y - 10, 10, 7, 0, Math.PI, 0);
        ctx.fill();

        // Spots
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(screen.x - 4, screen.y - 12, 2, 0, Math.PI * 2);
        ctx.arc(screen.x + 3, screen.y - 14, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render bush
    renderBush(bush) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(bush.x, bush.y);

        // Bush body
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 10, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(screen.x - 8, screen.y - 8, 10, 0, Math.PI * 2);
        ctx.arc(screen.x + 8, screen.y - 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Berries
        if (bush.harvestable) {
            ctx.fillStyle = '#4A148C';
            for (let i = 0; i < 5; i++) {
                const bx = screen.x + (Math.sin(i * 1.5) * 10);
                const by = screen.y - 10 + (Math.cos(i * 2) * 8);
                ctx.beginPath();
                ctx.arc(bx, by, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Render cactus
    renderCactus(cactus) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(cactus.x, cactus.y);

        // Main body
        ctx.fillStyle = '#228B22';
        ctx.fillRect(screen.x - 8, screen.y - 35, 16, 40);

        // Arms
        ctx.fillRect(screen.x - 20, screen.y - 25, 12, 8);
        ctx.fillRect(screen.x - 20, screen.y - 25, 8, 20);

        ctx.fillRect(screen.x + 8, screen.y - 20, 12, 8);
        ctx.fillRect(screen.x + 12, screen.y - 20, 8, 15);

        // Highlights
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(screen.x - 4, screen.y - 30, 4, 30);
    }

    // Render building
    renderBuilding(building) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(building.x, building.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(screen.x + 5, screen.y + building.height + 5, building.width, 10);

        if (building.type === 'well') {
            // Well
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.ellipse(screen.x + 20, screen.y + 20, 20, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1E3A8A';
            ctx.beginPath();
            ctx.ellipse(screen.x + 20, screen.y + 20, 12, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Roof
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screen.x + 5, screen.y - 5, 5, 30);
            ctx.fillRect(screen.x + 30, screen.y - 5, 5, 30);
            ctx.fillRect(screen.x, screen.y - 10, 40, 5);
            return;
        }

        // Wall
        const wallColors = {
            house: '#D2B48C',
            shop: '#DEB887',
            inn: '#BC8F8F'
        };
        ctx.fillStyle = wallColors[building.type] || '#D2B48C';
        ctx.fillRect(screen.x, screen.y, building.width, building.height);

        // Roof
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(screen.x - 5, screen.y);
        ctx.lineTo(screen.x + building.width / 2, screen.y - 30);
        ctx.lineTo(screen.x + building.width + 5, screen.y);
        ctx.closePath();
        ctx.fill();

        // Door
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
            screen.x + building.width / 2 - 10,
            screen.y + building.height - 25,
            20, 25
        );

        // Window
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(screen.x + 10, screen.y + 15, 15, 15);
        if (building.width > 70) {
            ctx.fillRect(screen.x + building.width - 25, screen.y + 15, 15, 15);
        }

        // Sign for shop/inn
        if (building.type === 'shop' || building.type === 'inn') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screen.x + building.width + 5, screen.y + 10, 3, 40);
            ctx.fillRect(screen.x + building.width, screen.y + 5, 25, 15);

            ctx.fillStyle = '#FFF';
            ctx.font = '8px Arial';
            ctx.fillText(
                building.type === 'shop' ? 'SHOP' : 'INN',
                screen.x + building.width + 3,
                screen.y + 15
            );
        }
    }

    // Render NPC
    renderNPC(npc) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(npc.x, npc.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + 8, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body colors based on type
        const colors = {
            villager: '#27AE60',
            merchant: '#8E44AD',
            elder: '#7F8C8D',
            guard: '#C0392B',
            wanderer: '#D35400'
        };

        // Body
        ctx.fillStyle = colors[npc.type] || '#27AE60';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 5, 10, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 18, 7, 0, Math.PI * 2);
        ctx.fill();

        // Type indicator
        const icons = {
            villager: '👤',
            merchant: '💰',
            elder: '👴',
            guard: '⚔️',
            wanderer: '🎒'
        };

        ctx.font = '12px Arial';
        ctx.fillText(icons[npc.type] || '👤', screen.x - 6, screen.y - 30);

        // Walking animation
        if (npc.state === 'walking') {
            const bobble = Math.sin(this.animTime * 10) * 2;
            ctx.fillStyle = colors[npc.type] || '#27AE60';
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 5 + bobble, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Render animal
    renderAnimal(animal) {
        const ctx = this.ctx;
        const screen = this.worldToScreen(animal.x, animal.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + 3, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        switch (animal.type) {
            case 'rabbit':
                // Body
                ctx.fillStyle = '#D2B48C';
                ctx.beginPath();
                ctx.ellipse(screen.x, screen.y - 5, 8, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                // Head
                ctx.beginPath();
                ctx.arc(screen.x + 6, screen.y - 8, 5, 0, Math.PI * 2);
                ctx.fill();
                // Ears
                ctx.fillRect(screen.x + 4, screen.y - 18, 2, 8);
                ctx.fillRect(screen.x + 8, screen.y - 16, 2, 6);
                break;

            case 'deer':
                // Body
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.ellipse(screen.x, screen.y - 8, 15, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                // Head
                ctx.beginPath();
                ctx.arc(screen.x + 15, screen.y - 15, 6, 0, Math.PI * 2);
                ctx.fill();
                // Antlers
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screen.x + 15, screen.y - 20);
                ctx.lineTo(screen.x + 12, screen.y - 28);
                ctx.lineTo(screen.x + 8, screen.y - 25);
                ctx.moveTo(screen.x + 15, screen.y - 20);
                ctx.lineTo(screen.x + 20, screen.y - 28);
                ctx.lineTo(screen.x + 24, screen.y - 25);
                ctx.stroke();
                // Legs
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screen.x - 10, screen.y - 3, 3, 10);
                ctx.fillRect(screen.x + 7, screen.y - 3, 3, 10);
                break;

            case 'bird':
                const fly = Math.sin(this.animTime * 15) * 5;
                // Body
                ctx.fillStyle = '#4169E1';
                ctx.beginPath();
                ctx.ellipse(screen.x, screen.y - 10 + fly, 6, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Wing
                ctx.beginPath();
                ctx.ellipse(screen.x, screen.y - 12 + fly + Math.sin(this.animTime * 20) * 3, 8, 3, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'fish':
                const swim = Math.sin(this.animTime * 8) * 3;
                ctx.fillStyle = '#FF6347';
                ctx.beginPath();
                ctx.ellipse(screen.x + swim, screen.y, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                ctx.beginPath();
                ctx.moveTo(screen.x - 8 + swim, screen.y);
                ctx.lineTo(screen.x - 15 + swim, screen.y - 5);
                ctx.lineTo(screen.x - 15 + swim, screen.y + 5);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    // Apply day/night lighting overlay
    applyLighting() {
        if (this.ambientLight < 1.0) {
            const ctx = this.ctx;
            ctx.fillStyle = `rgba(0, 0, 30, ${1 - this.ambientLight})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    // Render minimap
    renderMinimap(minimapCanvas, world, player) {
        const ctx = minimapCanvas.getContext('2d');
        const size = minimapCanvas.width;
        const scale = 0.1;

        ctx.clearRect(0, 0, size, size);

        // Draw circular mask
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        // Draw terrain
        const viewRadius = size / (2 * scale);
        for (let y = 0; y < size; y += 4) {
            for (let x = 0; x < size; x += 4) {
                const worldX = player.x + (x - size / 2) / scale;
                const worldY = player.y + (y - size / 2) / scale;
                ctx.fillStyle = world.getTerrainColor(worldX, worldY);
                ctx.fillRect(x, y, 4, 4);
            }
        }

        // Draw buildings
        ctx.fillStyle = '#8B4513';
        for (const building of world.buildings) {
            const mx = size / 2 + (building.x - player.x) * scale;
            const my = size / 2 + (building.y - player.y) * scale;
            if (mx > 0 && mx < size && my > 0 && my < size) {
                ctx.fillRect(mx - 2, my - 2, 4, 4);
            }
        }

        // Draw NPCs
        ctx.fillStyle = '#FFD700';
        for (const npc of world.npcs) {
            const mx = size / 2 + (npc.x - player.x) * scale;
            const my = size / 2 + (npc.y - player.y) * scale;
            if (mx > 0 && mx < size && my > 0 && my < size) {
                ctx.beginPath();
                ctx.arc(mx, my, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw player (center)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size / 2, size / 2);
        ctx.lineTo(
            size / 2 + Math.cos(player.direction) * 10,
            size / 2 + Math.sin(player.direction) * 10
        );
        ctx.stroke();

        ctx.restore();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}
