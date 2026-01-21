// UI Management System
import { ITEMS, RECIPES, QUESTS, NPC_DIALOGS } from './config.js';

export class UIManager {
    constructor(game) {
        this.game = game;

        // Get UI elements
        this.elements = {
            healthBar: document.getElementById('health-bar'),
            healthText: document.getElementById('health-text'),
            staminaBar: document.getElementById('stamina-bar'),
            staminaText: document.getElementById('stamina-text'),
            timeDisplay: document.getElementById('time-display'),
            quickbar: document.getElementById('quickbar'),
            interactionPrompt: document.getElementById('interaction-prompt'),
            promptText: document.getElementById('prompt-text'),
            dialogBox: document.getElementById('dialog-box'),
            dialogSpeaker: document.getElementById('dialog-speaker'),
            dialogText: document.getElementById('dialog-text'),
            inventoryPanel: document.getElementById('inventory-panel'),
            inventoryGrid: document.getElementById('inventory-grid'),
            itemDescription: document.getElementById('item-description'),
            craftingPanel: document.getElementById('crafting-panel'),
            recipeList: document.getElementById('recipe-list'),
            questPanel: document.getElementById('quest-panel'),
            questList: document.getElementById('quest-list'),
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn')
        };

        // State
        this.inventoryOpen = false;
        this.craftingOpen = false;
        this.questsOpen = false;
        this.dialogActive = false;
        this.currentDialog = null;
        this.dialogIndex = 0;

        // Active quests
        this.activeQuests = [];

        // Setup event listeners
        this.setupEventListeners();

        // Initialize UI
        this.initializeQuickbar();
        this.initializeInventoryGrid();
    }

    setupEventListeners() {
        // Start button
        this.elements.startBtn.addEventListener('click', () => {
            this.elements.startScreen.classList.add('hidden');
            this.game.start();
        });

        // Close buttons
        document.getElementById('close-inventory').addEventListener('click', () => {
            this.closeInventory();
        });

        document.getElementById('close-crafting').addEventListener('click', () => {
            this.closeCrafting();
        });

        document.getElementById('close-quests').addEventListener('click', () => {
            this.closeQuests();
        });

        // Quickbar slot clicks
        this.elements.quickbar.querySelectorAll('.slot').forEach((slot, index) => {
            slot.addEventListener('click', () => {
                this.selectQuickbarSlot(index);
            });
        });
    }

    initializeQuickbar() {
        const slots = this.elements.quickbar.querySelectorAll('.slot');
        slots.forEach((slot, index) => {
            slot.innerHTML = `<span class="key-hint">${index + 1}</span>`;
        });
    }

    initializeInventoryGrid() {
        this.elements.inventoryGrid.innerHTML = '';
        for (let i = 0; i < 24; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.slot = i;
            slot.addEventListener('click', () => this.onInventorySlotClick(i));
            this.elements.inventoryGrid.appendChild(slot);
        }
    }

    // Update all UI elements
    update(player, gameTime) {
        this.updateStats(player);
        this.updateTime(gameTime);
        this.updateQuickbar(player);
    }

    // Update health and stamina bars
    updateStats(player) {
        const healthPercent = (player.health / player.maxHealth) * 100;
        const staminaPercent = (player.stamina / player.maxStamina) * 100;

        this.elements.healthBar.style.width = `${healthPercent}%`;
        this.elements.healthText.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;

        this.elements.staminaBar.style.width = `${staminaPercent}%`;
        this.elements.staminaText.textContent = `${Math.floor(player.stamina)}/${player.maxStamina}`;
    }

    // Update time display
    updateTime(gameTime) {
        const hours = Math.floor(gameTime);
        const minutes = Math.floor((gameTime - hours) * 60);
        this.elements.timeDisplay.textContent =
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Update quickbar display
    updateQuickbar(player) {
        const slots = this.elements.quickbar.querySelectorAll('.slot');
        slots.forEach((slot, index) => {
            const item = player.quickbar[index];

            // Clear slot
            slot.innerHTML = `<span class="key-hint">${index + 1}</span>`;

            if (item) {
                const itemDef = ITEMS[item.id];
                if (itemDef) {
                    const icon = document.createElement('span');
                    icon.className = 'item-icon';
                    icon.textContent = itemDef.icon;
                    slot.appendChild(icon);

                    if (item.count > 1) {
                        const count = document.createElement('span');
                        count.className = 'item-count';
                        count.textContent = item.count;
                        slot.appendChild(count);
                    }
                }
            }

            // Highlight selected slot
            if (index === player.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    // Select quickbar slot
    selectQuickbarSlot(index) {
        if (this.game.player) {
            this.game.player.selectedSlot = index;
            this.updateQuickbar(this.game.player);
        }
    }

    // Show interaction prompt
    showInteractionPrompt(text) {
        this.elements.promptText.textContent = text;
        this.elements.interactionPrompt.classList.remove('hidden');
    }

    // Hide interaction prompt
    hideInteractionPrompt() {
        this.elements.interactionPrompt.classList.add('hidden');
    }

    // Show dialog
    showDialog(speaker, text) {
        this.dialogActive = true;
        this.elements.dialogSpeaker.textContent = speaker;
        this.elements.dialogText.textContent = text;
        this.elements.dialogBox.classList.remove('hidden');
    }

    // Start NPC dialog
    startNPCDialog(npc) {
        const dialogs = NPC_DIALOGS[npc.type] || NPC_DIALOGS.villager;
        this.currentDialog = {
            speaker: this.getNPCName(npc),
            lines: dialogs
        };
        this.dialogIndex = 0;
        this.showDialog(this.currentDialog.speaker, this.currentDialog.lines[0]);
    }

    // Get NPC display name
    getNPCName(npc) {
        const names = {
            villager: 'Villager',
            merchant: 'Merchant',
            elder: 'Village Elder',
            guard: 'Guard',
            wanderer: 'Wandering Traveler'
        };
        return names[npc.type] || 'Stranger';
    }

    // Advance dialog
    advanceDialog() {
        if (!this.currentDialog) {
            this.closeDialog();
            return;
        }

        this.dialogIndex++;
        if (this.dialogIndex >= this.currentDialog.lines.length) {
            this.closeDialog();

            // Potentially give quest
            if (this.activeQuests.length < 3 && Math.random() > 0.5) {
                const availableQuests = QUESTS.filter(q =>
                    !this.activeQuests.find(aq => aq.id === q.id)
                );
                if (availableQuests.length > 0) {
                    const quest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
                    this.startQuest(quest);
                }
            }
        } else {
            this.showDialog(this.currentDialog.speaker, this.currentDialog.lines[this.dialogIndex]);
        }
    }

    // Close dialog
    closeDialog() {
        this.dialogActive = false;
        this.currentDialog = null;
        this.dialogIndex = 0;
        this.elements.dialogBox.classList.add('hidden');
    }

    // Toggle inventory
    toggleInventory() {
        if (this.inventoryOpen) {
            this.closeInventory();
        } else {
            this.openInventory();
        }
    }

    // Open inventory
    openInventory() {
        this.inventoryOpen = true;
        this.closeCrafting();
        this.closeQuests();
        this.updateInventoryGrid();
        this.elements.inventoryPanel.classList.remove('hidden');
    }

    // Close inventory
    closeInventory() {
        this.inventoryOpen = false;
        this.elements.inventoryPanel.classList.add('hidden');
    }

    // Update inventory grid display
    updateInventoryGrid() {
        const player = this.game.player;
        if (!player) return;

        const slots = this.elements.inventoryGrid.querySelectorAll('.slot');
        slots.forEach((slot, index) => {
            const item = player.inventory[index];

            slot.innerHTML = '';

            if (item) {
                const itemDef = ITEMS[item.id];
                if (itemDef) {
                    const icon = document.createElement('span');
                    icon.className = 'item-icon';
                    icon.textContent = itemDef.icon;
                    slot.appendChild(icon);

                    if (item.count > 1) {
                        const count = document.createElement('span');
                        count.className = 'item-count';
                        count.textContent = item.count;
                        slot.appendChild(count);
                    }
                }
            }
        });
    }

    // Handle inventory slot click
    onInventorySlotClick(index) {
        const player = this.game.player;
        if (!player) return;

        const item = player.inventory[index];
        if (item) {
            const itemDef = ITEMS[item.id];
            this.elements.itemDescription.textContent =
                `${itemDef.name}: ${itemDef.description}`;

            // Move to quickbar option (find empty slot)
            const emptySlot = player.quickbar.findIndex(s => s === null);
            if (emptySlot !== -1) {
                player.quickbar[emptySlot] = { ...item };
                player.inventory[index] = null;
                this.updateInventoryGrid();
                this.updateQuickbar(player);
            }
        } else {
            this.elements.itemDescription.textContent = 'Empty slot';
        }
    }

    // Toggle crafting
    toggleCrafting() {
        if (this.craftingOpen) {
            this.closeCrafting();
        } else {
            this.openCrafting();
        }
    }

    // Open crafting panel
    openCrafting() {
        this.craftingOpen = true;
        this.closeInventory();
        this.closeQuests();
        this.updateCraftingList();
        this.elements.craftingPanel.classList.remove('hidden');
    }

    // Close crafting panel
    closeCrafting() {
        this.craftingOpen = false;
        this.elements.craftingPanel.classList.add('hidden');
    }

    // Update crafting recipe list
    updateCraftingList() {
        const player = this.game.player;
        if (!player) return;

        this.elements.recipeList.innerHTML = '';

        for (const recipe of RECIPES) {
            const canCraft = this.canCraftRecipe(recipe, player);

            const recipeDiv = document.createElement('div');
            recipeDiv.className = `recipe-item ${canCraft ? 'can-craft' : 'cannot-craft'}`;

            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = `
                <div class="recipe-name">${ITEMS[recipe.result].icon} ${recipe.name}</div>
                <div class="recipe-materials">${this.getMaterialsText(recipe, player)}</div>
            `;

            const craftBtn = document.createElement('button');
            craftBtn.className = 'craft-btn';
            craftBtn.textContent = 'Craft';
            craftBtn.disabled = !canCraft;
            craftBtn.addEventListener('click', () => this.craftRecipe(recipe));

            recipeDiv.appendChild(infoDiv);
            recipeDiv.appendChild(craftBtn);
            this.elements.recipeList.appendChild(recipeDiv);
        }
    }

    // Check if recipe can be crafted
    canCraftRecipe(recipe, player) {
        for (const [material, amount] of Object.entries(recipe.materials)) {
            if (!player.hasItem(material, amount)) {
                return false;
            }
        }
        return true;
    }

    // Get materials text for recipe
    getMaterialsText(recipe, player) {
        return Object.entries(recipe.materials)
            .map(([material, amount]) => {
                const has = player.countItem(material);
                const itemDef = ITEMS[material];
                const color = has >= amount ? '#2ecc71' : '#e74c3c';
                return `<span style="color: ${color}">${itemDef.icon} ${has}/${amount}</span>`;
            })
            .join(' ');
    }

    // Craft a recipe
    craftRecipe(recipe) {
        const player = this.game.player;
        if (!player || !this.canCraftRecipe(recipe, player)) return;

        // Remove materials
        for (const [material, amount] of Object.entries(recipe.materials)) {
            player.removeItem(material, amount);
        }

        // Add result
        player.addItem(recipe.result, recipe.resultCount);

        // Update UI
        this.updateCraftingList();
        this.updateQuickbar(player);

        // Check quests
        this.checkQuestProgress();
    }

    // Toggle quests panel
    toggleQuests() {
        if (this.questsOpen) {
            this.closeQuests();
        } else {
            this.openQuests();
        }
    }

    // Open quests panel
    openQuests() {
        this.questsOpen = true;
        this.closeInventory();
        this.closeCrafting();
        this.updateQuestList();
        this.elements.questPanel.classList.remove('hidden');
    }

    // Close quests panel
    closeQuests() {
        this.questsOpen = false;
        this.elements.questPanel.classList.add('hidden');
    }

    // Start a quest
    startQuest(quest) {
        if (this.activeQuests.find(q => q.id === quest.id)) return;

        this.activeQuests.push({
            ...quest,
            progress: 0,
            completed: false
        });

        this.showNotification(`New Quest: ${quest.title}`);
    }

    // Update quest list display
    updateQuestList() {
        this.elements.questList.innerHTML = '';

        if (this.activeQuests.length === 0) {
            this.elements.questList.innerHTML = '<p style="color: #888;">No active quests. Talk to NPCs to receive quests!</p>';
            return;
        }

        for (const quest of this.activeQuests) {
            const questDiv = document.createElement('div');
            questDiv.className = `quest-item ${quest.completed ? 'completed' : ''}`;

            const progress = this.getQuestProgress(quest);

            questDiv.innerHTML = `
                <div class="quest-title">${quest.title} ${quest.completed ? '✓' : ''}</div>
                <div class="quest-description">${quest.description}</div>
                <div class="quest-progress">Progress: ${progress}</div>
            `;

            this.elements.questList.appendChild(questDiv);
        }
    }

    // Get quest progress text
    getQuestProgress(quest) {
        const player = this.game.player;
        if (!player) return '0/0';

        if (quest.objective.type === 'collect') {
            const current = player.countItem(quest.objective.item);
            return `${Math.min(current, quest.objective.amount)}/${quest.objective.amount}`;
        } else if (quest.objective.type === 'explore') {
            const discovered = player.discoveredBiomes.size;
            return `${Math.min(discovered, quest.objective.biomesNeeded)}/${quest.objective.biomesNeeded}`;
        }

        return '0/0';
    }

    // Check quest progress and complete if done
    checkQuestProgress() {
        const player = this.game.player;
        if (!player) return;

        for (const quest of this.activeQuests) {
            if (quest.completed) continue;

            let isComplete = false;

            if (quest.objective.type === 'collect') {
                isComplete = player.countItem(quest.objective.item) >= quest.objective.amount;
            } else if (quest.objective.type === 'explore') {
                isComplete = player.discoveredBiomes.size >= quest.objective.biomesNeeded;
            }

            if (isComplete) {
                quest.completed = true;
                this.completeQuest(quest);
            }
        }
    }

    // Complete a quest and give rewards
    completeQuest(quest) {
        const player = this.game.player;

        // Give rewards
        for (const [item, amount] of Object.entries(quest.reward)) {
            player.addItem(item, amount);
        }

        this.showNotification(`Quest Complete: ${quest.title}! Rewards received.`);
        this.updateQuickbar(player);
    }

    // Show notification
    showNotification(text) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #f39c12;
            padding: 15px 30px;
            border-radius: 8px;
            border: 2px solid #f39c12;
            font-size: 16px;
            z-index: 1000;
            animation: fadeInOut 3s forwards;
        `;
        notification.textContent = text;

        // Add animation style if not exists
        if (!document.getElementById('notification-style')) {
            const style = document.createElement('style');
            style.id = 'notification-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Check if any UI panel is open
    isAnyPanelOpen() {
        return this.inventoryOpen || this.craftingOpen || this.questsOpen || this.dialogActive;
    }

    // Close all panels
    closeAllPanels() {
        this.closeInventory();
        this.closeCrafting();
        this.closeQuests();
        this.closeDialog();
    }
}
