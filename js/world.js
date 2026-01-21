// World generation and management
import { CONFIG, ITEMS } from './config.js';
import { SimplexNoise, SeededRandom, randomChoice, generateId } from './utils.js';

export class World {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.noise = new SimplexNoise(seed);
        this.rng = new SeededRandom(seed);

        this.chunks = new Map();
        this.entities = [];
        this.buildings = [];
        this.npcs = [];
        this.animals = [];
        this.resources = new Map(); // Tracks harvestable resources

        this.biomeNoise = new SimplexNoise(seed + 1);
        this.moistureNoise = new SimplexNoise(seed + 2);
    }

    // Get biome at world position
    getBiome(worldX, worldY) {
        const scale = 0.002;
        const elevation = this.noise.fbm(worldX * scale, worldY * scale, 4);
        const moisture = this.moistureNoise.fbm(worldX * scale * 1.5, worldY * scale * 1.5, 3);

        // Determine biome based on elevation and moisture
        if (elevation < -0.3) return 'water';
        if (elevation < -0.2) return 'beach';
        if (elevation > 0.6) return 'mountain';
        if (elevation > 0.5) return 'rocky';

        if (moisture > 0.3) return 'forest';
        if (moisture < -0.2) return 'desert';

        return 'plains';
    }

    // Get terrain color at position
    getTerrainColor(worldX, worldY) {
        const biome = this.getBiome(worldX, worldY);
        const detail = this.noise.noise2D(worldX * 0.1, worldY * 0.1) * 0.1;

        switch (biome) {
            case 'water':
                const depth = this.noise.fbm(worldX * 0.002, worldY * 0.002, 4);
                return depth < -0.4 ? '#1E3A8A' : '#4169E1';
            case 'beach':
                return '#F4D03F';
            case 'mountain':
                return '#696969';
            case 'rocky':
                return '#808080';
            case 'forest':
                return detail > 0 ? '#228B22' : '#1B5E20';
            case 'desert':
                return detail > 0 ? '#D2B48C' : '#C4A35A';
            case 'plains':
            default:
                return detail > 0 ? '#90EE90' : '#7CCD7C';
        }
    }

    // Check if position is walkable
    isWalkable(worldX, worldY) {
        const biome = this.getBiome(worldX, worldY);
        if (biome === 'water') return false;

        // Check collision with buildings
        for (const building of this.buildings) {
            if (
                worldX >= building.x &&
                worldX <= building.x + building.width &&
                worldY >= building.y &&
                worldY <= building.y + building.height
            ) {
                // Allow walking through doors
                if (building.door) {
                    const doorX = building.x + building.width / 2;
                    const doorY = building.y + building.height;
                    if (Math.abs(worldX - doorX) < 20 && Math.abs(worldY - doorY) < 20) {
                        return true;
                    }
                }
                return false;
            }
        }

        return true;
    }

    // Generate chunk key
    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    // Get or generate chunk
    getChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);

        if (!this.chunks.has(key)) {
            this.generateChunk(chunkX, chunkY);
        }

        return this.chunks.get(key);
    }

    // Generate a chunk with terrain and objects
    generateChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        const chunkRng = new SeededRandom(this.seed + chunkX * 1000 + chunkY);

        const chunk = {
            x: chunkX,
            y: chunkY,
            tiles: [],
            objects: [],
            generated: true
        };

        const worldStartX = chunkX * CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;
        const worldStartY = chunkY * CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;

        // Generate terrain tiles
        for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
            chunk.tiles[ty] = [];
            for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
                const worldX = worldStartX + tx * CONFIG.TILE_SIZE;
                const worldY = worldStartY + ty * CONFIG.TILE_SIZE;
                chunk.tiles[ty][tx] = {
                    color: this.getTerrainColor(worldX, worldY),
                    biome: this.getBiome(worldX, worldY)
                };
            }
        }

        // Generate objects based on biome
        for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
            for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
                const worldX = worldStartX + tx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const worldY = worldStartY + ty * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
                const biome = chunk.tiles[ty][tx].biome;

                if (biome === 'water' || biome === 'beach') continue;

                const roll = chunkRng.next();

                // Trees in forest and plains
                if ((biome === 'forest' || biome === 'plains') && roll < CONFIG.TREE_DENSITY) {
                    const treeType = biome === 'forest' ? 'pine' : 'oak';
                    chunk.objects.push({
                        id: generateId(),
                        type: 'tree',
                        treeType,
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: true,
                        resource: 'wood',
                        amount: chunkRng.nextInt(2, 4)
                    });
                }

                // Rocks in rocky and mountain areas
                if ((biome === 'rocky' || biome === 'mountain') && roll < CONFIG.ROCK_DENSITY * 2) {
                    chunk.objects.push({
                        id: generateId(),
                        type: 'rock',
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: true,
                        resource: chunkRng.next() > 0.9 ? 'gem' : 'stone',
                        amount: chunkRng.nextInt(1, 3)
                    });
                }

                // Flowers in plains
                if (biome === 'plains' && roll < CONFIG.FLOWER_DENSITY) {
                    chunk.objects.push({
                        id: generateId(),
                        type: 'flower',
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: true,
                        resource: 'flower',
                        amount: 1
                    });
                }

                // Mushrooms in forest
                if (biome === 'forest' && chunkRng.next() < 0.02) {
                    chunk.objects.push({
                        id: generateId(),
                        type: 'mushroom',
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: true,
                        resource: 'mushroom',
                        amount: 1
                    });
                }

                // Berry bushes
                if ((biome === 'forest' || biome === 'plains') && chunkRng.next() < 0.015) {
                    chunk.objects.push({
                        id: generateId(),
                        type: 'bush',
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: true,
                        resource: 'berry',
                        amount: chunkRng.nextInt(2, 5)
                    });
                }

                // Cacti in desert
                if (biome === 'desert' && chunkRng.next() < 0.02) {
                    chunk.objects.push({
                        id: generateId(),
                        type: 'cactus',
                        x: worldX + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        y: worldY + (chunkRng.next() - 0.5) * CONFIG.TILE_SIZE,
                        harvestable: false
                    });
                }

                // Buildings (villages)
                if (biome === 'plains' && chunkRng.next() < CONFIG.BUILDING_DENSITY) {
                    this.generateBuilding(worldX, worldY, chunkRng);
                }
            }
        }

        this.chunks.set(key, chunk);
        return chunk;
    }

    // Generate a building
    generateBuilding(x, y, rng) {
        const types = ['house', 'shop', 'inn', 'well'];
        const type = randomChoice(types, rng);

        const building = {
            id: generateId(),
            type,
            x: x,
            y: y,
            width: type === 'well' ? 40 : rng.nextInt(60, 100),
            height: type === 'well' ? 40 : rng.nextInt(50, 80),
            door: type !== 'well',
            interactable: true
        };

        this.buildings.push(building);
        return building;
    }

    // Spawn NPCs at appropriate locations
    spawnNPCs(playerX, playerY) {
        const npcTypes = ['villager', 'merchant', 'elder', 'guard', 'wanderer'];
        const rng = new SeededRandom(this.seed + 999);

        for (let i = 0; i < CONFIG.NPC_COUNT; i++) {
            const angle = rng.next() * Math.PI * 2;
            const distance = 200 + rng.next() * 800;
            let x = playerX + Math.cos(angle) * distance;
            let y = playerY + Math.sin(angle) * distance;

            // Find walkable position
            let attempts = 0;
            while (!this.isWalkable(x, y) && attempts < 10) {
                x += (rng.next() - 0.5) * 100;
                y += (rng.next() - 0.5) * 100;
                attempts++;
            }

            if (this.isWalkable(x, y)) {
                this.npcs.push({
                    id: generateId(),
                    type: randomChoice(npcTypes, rng),
                    x,
                    y,
                    homeX: x,
                    homeY: y,
                    direction: rng.next() * Math.PI * 2,
                    state: 'idle',
                    stateTimer: rng.next() * 5,
                    interactable: true
                });
            }
        }
    }

    // Spawn animals
    spawnAnimals(playerX, playerY) {
        const animalTypes = [
            { type: 'rabbit', biomes: ['plains', 'forest'], speed: 80 },
            { type: 'deer', biomes: ['forest', 'plains'], speed: 120 },
            { type: 'bird', biomes: ['plains', 'forest', 'beach'], speed: 60 },
            { type: 'fish', biomes: ['water'], speed: 40 }
        ];

        const rng = new SeededRandom(this.seed + 888);

        for (let i = 0; i < CONFIG.ANIMAL_COUNT; i++) {
            const animalDef = randomChoice(animalTypes, rng);
            const angle = rng.next() * Math.PI * 2;
            const distance = 100 + rng.next() * 600;
            let x = playerX + Math.cos(angle) * distance;
            let y = playerY + Math.sin(angle) * distance;

            const biome = this.getBiome(x, y);

            if (animalDef.biomes.includes(biome)) {
                this.animals.push({
                    id: generateId(),
                    type: animalDef.type,
                    x,
                    y,
                    speed: animalDef.speed,
                    direction: rng.next() * Math.PI * 2,
                    state: 'idle',
                    stateTimer: rng.next() * 3
                });
            }
        }
    }

    // Update world state
    update(deltaTime, playerX, playerY) {
        // Update NPCs
        for (const npc of this.npcs) {
            this.updateNPC(npc, deltaTime, playerX, playerY);
        }

        // Update animals
        for (const animal of this.animals) {
            this.updateAnimal(animal, deltaTime, playerX, playerY);
        }
    }

    // Update NPC behavior
    updateNPC(npc, deltaTime, playerX, playerY) {
        npc.stateTimer -= deltaTime;

        const distToPlayer = Math.hypot(npc.x - playerX, npc.y - playerY);

        if (npc.stateTimer <= 0) {
            // Change state
            if (npc.state === 'idle') {
                npc.state = 'walking';
                npc.direction = Math.random() * Math.PI * 2;
                npc.stateTimer = 2 + Math.random() * 3;
            } else {
                npc.state = 'idle';
                npc.stateTimer = 1 + Math.random() * 4;
            }
        }

        // Face player if nearby
        if (distToPlayer < 100) {
            npc.direction = Math.atan2(playerY - npc.y, playerX - npc.x);
            npc.state = 'idle';
        }

        // Walk
        if (npc.state === 'walking') {
            const speed = 30;
            const newX = npc.x + Math.cos(npc.direction) * speed * deltaTime;
            const newY = npc.y + Math.sin(npc.direction) * speed * deltaTime;

            // Stay near home
            const distFromHome = Math.hypot(newX - npc.homeX, newY - npc.homeY);
            if (distFromHome < 150 && this.isWalkable(newX, newY)) {
                npc.x = newX;
                npc.y = newY;
            } else {
                // Turn around
                npc.direction = Math.atan2(npc.homeY - npc.y, npc.homeX - npc.x);
            }
        }
    }

    // Update animal behavior
    updateAnimal(animal, deltaTime, playerX, playerY) {
        animal.stateTimer -= deltaTime;

        const distToPlayer = Math.hypot(animal.x - playerX, animal.y - playerY);

        // Flee from player
        if (distToPlayer < 80 && animal.type !== 'fish') {
            animal.state = 'fleeing';
            animal.direction = Math.atan2(animal.y - playerY, animal.x - playerX);
            animal.stateTimer = 2;
        }

        if (animal.stateTimer <= 0) {
            if (animal.state === 'idle') {
                animal.state = 'moving';
                animal.direction = Math.random() * Math.PI * 2;
                animal.stateTimer = 1 + Math.random() * 2;
            } else {
                animal.state = 'idle';
                animal.stateTimer = 2 + Math.random() * 3;
            }
        }

        // Move
        if (animal.state === 'moving' || animal.state === 'fleeing') {
            const speed = animal.state === 'fleeing' ? animal.speed * 1.5 : animal.speed;
            const newX = animal.x + Math.cos(animal.direction) * speed * deltaTime;
            const newY = animal.y + Math.sin(animal.direction) * speed * deltaTime;

            const newBiome = this.getBiome(newX, newY);
            const validBiome = animal.type === 'fish'
                ? newBiome === 'water'
                : newBiome !== 'water';

            if (validBiome) {
                animal.x = newX;
                animal.y = newY;
            } else {
                animal.direction = Math.random() * Math.PI * 2;
            }
        }
    }

    // Harvest resource from object
    harvestObject(objectId) {
        for (const chunk of this.chunks.values()) {
            const objIndex = chunk.objects.findIndex(o => o.id === objectId);
            if (objIndex !== -1) {
                const obj = chunk.objects[objIndex];
                if (obj.harvestable) {
                    const resource = obj.resource;
                    const amount = obj.amount;

                    // Remove or deplete object
                    if (obj.type === 'tree' || obj.type === 'rock') {
                        chunk.objects.splice(objIndex, 1);
                    } else {
                        obj.harvestable = false;
                        // Respawn timer (would need to track this)
                        setTimeout(() => {
                            obj.harvestable = true;
                        }, 30000);
                    }

                    return { resource, amount };
                }
            }
        }
        return null;
    }

    // Get objects near a position
    getObjectsNear(x, y, radius) {
        const objects = [];

        // Calculate which chunks to check
        const chunkX = Math.floor(x / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE));
        const chunkY = Math.floor(y / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE));

        for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
            for (let cy = chunkY - 1; cy <= chunkY + 1; cy++) {
                const chunk = this.chunks.get(this.getChunkKey(cx, cy));
                if (chunk) {
                    for (const obj of chunk.objects) {
                        const dist = Math.hypot(obj.x - x, obj.y - y);
                        if (dist <= radius) {
                            objects.push({ ...obj, distance: dist });
                        }
                    }
                }
            }
        }

        return objects.sort((a, b) => a.distance - b.distance);
    }

    // Get NPCs near position
    getNPCsNear(x, y, radius) {
        return this.npcs
            .map(npc => ({ ...npc, distance: Math.hypot(npc.x - x, npc.y - y) }))
            .filter(npc => npc.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }

    // Get buildings near position
    getBuildingsNear(x, y, radius) {
        return this.buildings
            .map(b => ({
                ...b,
                distance: Math.hypot(b.x + b.width / 2 - x, b.y + b.height / 2 - y)
            }))
            .filter(b => b.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }
}
