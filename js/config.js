// Game Configuration
export const CONFIG = {
    // World settings
    WORLD_SIZE: 2000,           // World size in tiles
    TILE_SIZE: 32,              // Pixels per tile
    CHUNK_SIZE: 16,             // Tiles per chunk
    RENDER_DISTANCE: 3,         // Chunks to render around player

    // Player settings
    PLAYER_SPEED: 150,          // Pixels per second
    PLAYER_RUN_MULTIPLIER: 1.8,
    PLAYER_SIZE: 24,
    PLAYER_MAX_HEALTH: 100,
    PLAYER_MAX_STAMINA: 100,
    STAMINA_DRAIN_RATE: 15,     // Per second while running
    STAMINA_REGEN_RATE: 10,     // Per second while not running
    HEALTH_REGEN_RATE: 1,       // Per second

    // Time settings
    DAY_LENGTH: 600,            // Seconds per game day
    DAWN_START: 5,              // Hour
    DAY_START: 7,
    DUSK_START: 18,
    NIGHT_START: 20,

    // Generation settings
    TREE_DENSITY: 0.08,
    ROCK_DENSITY: 0.03,
    FLOWER_DENSITY: 0.05,
    BUILDING_DENSITY: 0.002,
    NPC_COUNT: 20,
    ANIMAL_COUNT: 30,

    // Interaction
    INTERACTION_RANGE: 50,

    // Colors for terrain
    COLORS: {
        GRASS_LIGHT: '#90EE90',
        GRASS_DARK: '#228B22',
        WATER: '#4169E1',
        WATER_DEEP: '#1E3A8A',
        SAND: '#F4D03F',
        DIRT: '#8B4513',
        STONE: '#808080',
        SNOW: '#FFFAFA'
    }
};

// Item definitions
export const ITEMS = {
    wood: { name: 'Wood', icon: '🪵', stackable: true, maxStack: 99, description: 'A piece of wood. Useful for crafting.' },
    stone: { name: 'Stone', icon: '🪨', stackable: true, maxStack: 99, description: 'A solid stone. Can be used for tools.' },
    flower: { name: 'Flower', icon: '🌸', stackable: true, maxStack: 99, description: 'A beautiful flower.' },
    apple: { name: 'Apple', icon: '🍎', stackable: true, maxStack: 20, description: 'A delicious apple. Restores 20 health.', consumable: true, healAmount: 20 },
    fish: { name: 'Fish', icon: '🐟', stackable: true, maxStack: 20, description: 'A fresh fish. Restores 15 health.', consumable: true, healAmount: 15 },
    mushroom: { name: 'Mushroom', icon: '🍄', stackable: true, maxStack: 20, description: 'A wild mushroom. Restores 10 health.', consumable: true, healAmount: 10 },
    berry: { name: 'Berry', icon: '🫐', stackable: true, maxStack: 30, description: 'Sweet berries. Restores 5 health.', consumable: true, healAmount: 5 },
    axe: { name: 'Axe', icon: '🪓', stackable: false, description: 'Chops trees faster. Durable tool.' },
    pickaxe: { name: 'Pickaxe', icon: '⛏️', stackable: false, description: 'Mines rocks efficiently.' },
    sword: { name: 'Sword', icon: '🗡️', stackable: false, description: 'A sharp sword for defense.' },
    torch: { name: 'Torch', icon: '🔦', stackable: true, maxStack: 10, description: 'Lights up the darkness.' },
    key: { name: 'Key', icon: '🔑', stackable: false, description: 'Opens locked doors.' },
    coin: { name: 'Coin', icon: '🪙', stackable: true, maxStack: 999, description: 'Currency for trading.' },
    gem: { name: 'Gem', icon: '💎', stackable: true, maxStack: 50, description: 'A valuable gemstone.' },
    potion: { name: 'Health Potion', icon: '🧪', stackable: true, maxStack: 10, description: 'Restores 50 health instantly.', consumable: true, healAmount: 50 }
};

// Crafting recipes
export const RECIPES = [
    { result: 'axe', resultCount: 1, materials: { wood: 3, stone: 2 }, name: 'Axe' },
    { result: 'pickaxe', resultCount: 1, materials: { wood: 2, stone: 3 }, name: 'Pickaxe' },
    { result: 'sword', resultCount: 1, materials: { wood: 1, stone: 4 }, name: 'Sword' },
    { result: 'torch', resultCount: 3, materials: { wood: 2 }, name: 'Torch (x3)' },
    { result: 'potion', resultCount: 1, materials: { flower: 3, mushroom: 2, berry: 5 }, name: 'Health Potion' }
];

// NPC Dialog templates
export const NPC_DIALOGS = {
    villager: [
        "Welcome, traveler! This village has been here for generations.",
        "Have you explored the forest to the north? They say there are treasures hidden there.",
        "The weather has been strange lately. Something is amiss in the world.",
        "If you find any gems, bring them to me. I'll pay good coin for them!"
    ],
    merchant: [
        "Looking to trade? I have the finest goods in the land!",
        "Coins for items, items for coins. That's how it works!",
        "You look like an adventurer. Need any supplies?",
        "I travel from village to village. Seen many strange things."
    ],
    elder: [
        "Ah, a young adventurer. Let me tell you about our village's history...",
        "Long ago, this land was filled with magic. Some say it still lingers.",
        "The ancient ruins to the east hold many secrets. Be careful if you venture there.",
        "I've lived here my whole life. Ask me anything about this region."
    ],
    guard: [
        "Halt! Oh, you're friendly. Carry on then.",
        "Stay vigilant. There are dangers lurking in the wilderness.",
        "I protect this village with my life.",
        "Report any suspicious activity to me immediately."
    ],
    wanderer: [
        "I've traveled across many lands. This place is unique.",
        "Keep moving, keep exploring. That's the adventurer's way!",
        "I once found a cave full of gems. Never found it again though...",
        "The world is vast. Have you seen the mountains to the west?"
    ]
};

// Quest definitions
export const QUESTS = [
    {
        id: 'gather_wood',
        title: 'Gathering Resources',
        description: 'Collect 10 pieces of wood to help the village.',
        objective: { type: 'collect', item: 'wood', amount: 10 },
        reward: { coin: 20 }
    },
    {
        id: 'gather_stone',
        title: 'Mining Task',
        description: 'Gather 8 stones for construction.',
        objective: { type: 'collect', item: 'stone', amount: 8 },
        reward: { coin: 25 }
    },
    {
        id: 'find_flowers',
        title: 'Flower Collection',
        description: 'Find 5 beautiful flowers for the village elder.',
        objective: { type: 'collect', item: 'flower', amount: 5 },
        reward: { coin: 15, potion: 1 }
    },
    {
        id: 'explore',
        title: 'Explorer',
        description: 'Discover 3 different biomes.',
        objective: { type: 'explore', biomesNeeded: 3 },
        reward: { gem: 2 }
    }
];
