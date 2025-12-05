// --- Data Structures ---

/**
 * A basic class for any entity in the game (Player or Enemy).
 */
class Character {
    constructor(name, maxHp, attack, defense) {
        this.name = name;
        this.maxHp = maxHp;
        this.currentHp = maxHp;
        this.attack = attack;
        this.defense = defense;
        this.isAlive = true;
    }

    takeDamage(damage) {
        // Simple damage calculation: damage reduced by defense
        let effectiveDamage = Math.max(0, damage - this.defense);
        this.currentHp -= effectiveDamage;

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isAlive = false;
        }

        return effectiveDamage;
    }

    // You would add more methods here: useAbility, heal, applyStatusEffect, etc.
}

// Global Game State Object
const gameState = {
    player: null,
    currentFloor: 1,
    currentGold: 0,
    currentEnemy: null,
    state: 'MENU' // States: 'MENU', 'VN_EVENT', 'COMBAT', 'GAME_OVER'
};

// --- Initialization and Core Functions ---

function updateStatsDisplay() {
    if (gameState.player) {
        document.getElementById('player-hp').textContent = `${gameState.player.currentHp}/${gameState.player.maxHp}`;
        document.getElementById('player-gold').textContent = gameState.currentGold;
        document.getElementById('current-floor').textContent = gameState.currentFloor;
    }
}

function displayDialogue(text) {
    document.getElementById('dialogue-text').textContent = text;
}

function clearActions() {
    document.getElementById('action-area').innerHTML = '';
}

function startGame() {
    // 1. Initialize Player
    gameState.player = new Character("The Adventurer", 100, 15, 5);
    gameState.currentFloor = 1;
    gameState.currentGold = 0;
    gameState.state = 'VN_EVENT'; // Start the run with an event

    updateStatsDisplay();
    displayDialogue("A new journey begins... You find yourself at the entrance to a mysterious dungeon.");
    
    // 2. Clear old buttons and show the first path choice
    clearActions();
    
    // 3. Move to the next stage of the run
    nextRunStage();
}

// This function will randomly determine if the next stage is Combat, a VN Event, or a Shop
function nextRunStage() {
    gameState.currentFloor++;
    updateStatsDisplay();
    clearActions();
    
    const encounterType = Math.floor(Math.random() * 3); // 0=Combat, 1=Event, 2=Shop
    
    if (encounterType === 0) {
        startCombat();
    } else if (encounterType === 1) {
        startVNEvent();
    } else {
        startShop();
    }
}

// Placeholder functions for the next phases
function startCombat() {
    gameState.state = 'COMBAT';
    gameState.currentEnemy = new Character("Goblin", 30, 8, 2);
    displayDialogue(`A wild ${gameState.currentEnemy.name} appears! Prepare for battle.`);
    // We will code the actual combat loop logic next!
    // For now, let's add a button to transition back
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `<button onclick="endCombatPlaceholder()">FIGHT!</button>`;
}

function startVNEvent() {
    gameState.state = 'VN_EVENT';
    displayDialogue("You find a hidden shrine. Do you PRAY for luck or SMASH it for loot?");
    
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `
        <button class="action-button" onclick="handleVNChoice('PRAY')">Pray (+HP)</button>
        <button class="action-button" onclick="handleVNChoice('SMASH')">Smash (+Gold)</button>
    `;
}

function handleVNChoice(choice) {
    if (choice === 'PRAY') {
        gameState.player.currentHp = Math.min(gameState.player.maxHp, gameState.player.currentHp + 10);
        displayDialogue("You feel invigorated. (+10 HP)");
    } else if (choice === 'SMASH') {
        gameState.currentGold += 5;
        displayDialogue("You find a few rusty coins. (+5 Gold)");
    }
    updateStatsDisplay();
    
    // After the choice, move to the next stage
    clearActions();
    document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="nextRunStage()">Continue Deeper</button>`;
}


// PLACEHOLDER to test the flow
function endCombatPlaceholder() {
    displayDialogue("The battle is over! You won!");
    gameState.currentGold += 10;
    clearActions();
    document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="nextRunStage()">Continue Deeper</button>`;
}

function startShop() {
    gameState.state = 'SHOP';
    displayDialogue("You find a dusty merchant. What would you like to buy?");
    clearActions();
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `
        <button class="action-button" onclick="nextRunStage()">Leave Shop</button>
    `;
}
