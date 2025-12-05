// --- Character Data Definitions (Initial Rosters) ---

const CHARACTER_DATA = {
    PLAYER: {
        name: "The Adventurer",
        maxHp: 100,
        attack: 15, // Base damage die size (1d15)
        defense: 5,
        speed: 10,
        coinFlips: 2 // Number of coins flipped in a Clash
    },
    GOBLIN: {
        name: "Goblin Grunt",
        maxHp: 30,
        attack: 8,
        defense: 2,
        speed: 6,
        coinFlips: 1
    },
    BRUTE: {
        name: "Stone Brute",
        maxHp: 50,
        attack: 20,
        defense: 10,
        speed: 3,
        coinFlips: 3
    }
};

// --- Data Structures ---

/**
 * A basic class for any entity in the game (Player or Enemy).
 * Added 'speed' and 'coinFlips' property for the Clash mechanic.
 */
class Character {
    constructor(data) {
        this.name = data.name;
        this.maxHp = data.maxHp;
        this.currentHp = data.maxHp;
        this.baseDefense = data.defense; // Base defense is stored separately
        this.defense = data.defense;     // Current defense is what changes
        this.attack = data.attack;
        this.speed = data.speed;
        this.coinFlips = data.coinFlips;
        this.isAlive = true;
    }

    takeDamage(damage) {
        // Simple damage calculation: damage reduced by current defense
        let effectiveDamage = Math.max(0, damage - this.defense);
        this.currentHp -= effectiveDamage;

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isAlive = false;
        }

        return effectiveDamage;
    }

    rollAttackDamage() {
        // Simple damage roll: 1d(Attack value) + min damage (1)
        return 1 + Math.floor(Math.random() * this.attack);
    }
}

// Global Game State Object
const gameState = {
    player: null,
    currentFloor: 1,
    currentGold: 0,
    currentEnemy: null,
    state: 'MENU' // States: 'MENU', 'VN_EVENT', 'COMBAT', 'GAME_OVER'
};

// Global State for the current combat turn
let currentTurn = {
    playerAction: null, // 'ATTACK', 'DEFEND', or 'ABILITY_X'
    enemyAction: null,
    log: []
};

// --- General Utility Functions ---

function updateStatsDisplay() {
    if (gameState.player) {
        document.getElementById('player-hp').textContent = `${gameState.player.currentHp}/${gameState.player.maxHp}`;
        document.getElementById('player-gold').textContent = gameState.currentGold;
        document.getElementById('current-floor').textContent = gameState.currentFloor;
    }
}

function displayDialogue(text) {
    // We use innerHTML here to allow for line breaks (<br>) from the combat log
    document.getElementById('dialogue-text').innerHTML = text;
}

function clearActions() {
    document.getElementById('action-area').innerHTML = '';
}

// --- Game Loop and Flow Functions ---

function startGame() {
    // 1. Initialize Player from data
    gameState.player = new Character(CHARACTER_DATA.PLAYER);
    gameState.currentFloor = 1;
    gameState.currentGold = 0;
    gameState.state = 'VN_EVENT'; 

    updateStatsDisplay();
    displayDialogue("A new journey begins... You find yourself at the entrance to a mysterious dungeon.");
    
    // 2. Clear old buttons and start the run
    clearActions();
    nextRunStage();
}

function nextRunStage() {
    if (gameState.state === 'COMBAT') {
        // Only increment floor AFTER successful combat
        gameState.currentFloor++;
    }
    
    updateStatsDisplay();
    clearActions();
    
    // Simple logic for determining the next stage
    const encounterType = Math.floor(Math.random() * 3); // 0=Combat, 1=Event, 2=Shop
    
    if (encounterType === 0) {
        startCombat();
    } else if (encounterType === 1) {
        startVNEvent();
    } else {
        startShop();
    }
}

// --- Visual Novel/Event Functions ---

function startVNEvent() {
    gameState.state = 'VN_EVENT';
    displayDialogue("You find a hidden shrine. Do you **PRAY** for luck or **SMASH** it for loot?");
    
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

function startShop() {
    gameState.state = 'SHOP';
    displayDialogue("You find a dusty merchant. What would you like to buy?");
    clearActions();
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `
        <button class="action-button" onclick="nextRunStage()">Leave Shop</button>
    `;
}


// --- Combat Functions ---

function startCombat() {
    gameState.state = 'COMBAT';
    
    // Randomly select an enemy for the floor
    const enemyType = Math.random() < 0.5 ? 'GOBLIN' : 'BRUTE'; 
    gameState.currentEnemy = new Character(CHARACTER_DATA[enemyType]);
    
    displayCombatOptions();
}

function displayCombatOptions() {
    const enemy = gameState.currentEnemy;
    
    // Reset defense buffs before offering options
    gameState.player.defense = gameState.player.baseDefense;
    enemy.defense = enemy.baseDefense;
    currentTurn.log = []; // Clear previous log/results
    
    displayDialogue(`Combat: **${enemy.name}** (HP: ${enemy.currentHp}/${enemy.maxHp}) vs. **${gameState.player.name}** (HP: ${gameState.player.currentHp}/${gameState.player.maxHp})`);
    
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `
        <button class="action-button" onclick="handlePlayerAction('ATTACK')">Attack (SPD: ${gameState.player.speed})</button>
        <button class="action-button" onclick="handlePlayerAction('DEFEND')">Defend (SPD: ${gameState.player.speed})</button>
    `;
    updateStatsDisplay();
}

function handlePlayerAction(action) {
    currentTurn.playerAction = action;
    
    // 1. Enemy chooses its action (Simple AI: 70% Attack, 30% Defend)
    currentTurn.enemyAction = (Math.random() < 0.7) ? 'ATTACK' : 'DEFEND';
    
    // 2. Resolve the turn
    resolveTurn();
}

function resolveTurn() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    currentTurn.log = []; // Reset turn log

    // 3. Check for CLASH (Both choose ATTACK)
    if (currentTurn.playerAction === 'ATTACK' && currentTurn.enemyAction === 'ATTACK') {
        runClash(player, enemy);
    } 
    // 4. Resolve Standard Actions (Speed Dependent)
    else {
        // Determine who is faster (if speeds are equal, player goes first)
        const playerIsFaster = player.speed >= enemy.speed;
        
        const resolutionOrder = playerIsFaster ? 
            [{ entity: player, action: currentTurn.playerAction, target: enemy }, 
             { entity: enemy, action: currentTurn.enemyAction, target: player }] :
            [{ entity: enemy, action: currentTurn.enemyAction, target: player }, 
             { entity: player, action: currentTurn.playerAction, target: enemy }];

        // Run the actions in speed order
        for (const { entity, action, target } of resolutionOrder) {
            if (!entity.isAlive || !target.isAlive) continue; // Stop if someone died

            if (action === 'ATTACK') {
                // Pass the action of the target to check for the speed-block logic
                const targetAction = (target === player) ? currentTurn.playerAction : currentTurn.enemyAction;
                handleAttack(entity, target, targetAction);
            } else if (action === 'DEFEND') {
                handleDefend(entity);
            }
        }
        
        // At the end of the turn, the temporary defense buff is removed by displayCombatOptions
    }

    // 5. Check for End of Combat
    endTurnChecks();
}

function handleAttack(attacker, defender, defenderAction) {
    // --- IMPLEMENTING SPEED-BLOCK LOGIC ---
    // If defender is Defending AND is FASTER than the attacker, they Block/Avoid
    const defenderIsFaster = defender.speed > attacker.speed;
    
    if (defenderAction === 'DEFEND' && defenderIsFaster) {
        currentTurn.log.push(`*${defender.name} is faster and successfully defended!* The attack misses.`);
        return; // Attack is completely avoided
    }
    
    // The defensive move is slower, so the attack hits regardless of the DEFEND action 
    // (though the DEFEND action still applies its +5 defense before damage calculation)

    let baseDamage = attacker.rollAttackDamage();
    let damageTaken = defender.takeDamage(baseDamage);
    
    currentTurn.log.push(`${attacker.name} attacks ${defender.name} for **${damageTaken}** damage!`);
}

function handleDefend(defender) {
    // Apply temporary defense buff
    defender.defense += 5; 
    currentTurn.log.push(`${defender.name} braces for impact, gaining +5 Defense this turn.`);
}

function flipCoins(numCoins) {
    let heads = 0;
    for (let i = 0; i < numCoins; i++) {
        if (Math.random() >= 0.5) { 
            heads++;
        }
    }
    return heads;
}

function runClash(p1, p2) {
    let p1Heads = flipCoins(p1.coinFlips);
    let p2Heads = flipCoins(p2.coinFlips);
    
    currentTurn.log.push(`***CLASH!*** Both combatants attack simultaneously!`);
    currentTurn.log.push(`${p1.name} flips ${p1.coinFlips} coins and gets **${p1Heads}** Heads.`);
    currentTurn.log.push(`${p2.name} flips ${p2.coinFlips} coins and gets **${p2Heads}** Heads.`);

    let winner, loser, winnerHeads;
    
    if (p1Heads > p2Heads) {
        winner = p1;
        loser = p2;
        winnerHeads = p1Heads;
    } else if (p2Heads > p1Heads) {
        winner = p2;
        loser = p1;
        winnerHeads = p2Heads;
    } else {
        // Draw: Both take a small hit
        let p1Taken = p1.takeDamage(p2.rollAttackDamage());
        let p2Taken = p2.takeDamage(p1.rollAttackDamage());
        
        currentTurn.log.push(`The clash is a DRAW! Both take damage.`);
        currentTurn.log.push(`${p1.name} takes ${p1Taken} damage. ${p2.name} takes ${p2Taken} damage.`);
        return;
    }

    // Winner gets the attack, plus bonus damage for heads
    let bonusDamage = winnerHeads * 2;
    let baseDamage = winner.rollAttackDamage();
    let totalDamage = baseDamage + bonusDamage;
    
    let damageTaken = loser.takeDamage(totalDamage);
    
    currentTurn.log.push(`**${winner.name} WINS** the clash!`);
    currentTurn.log.push(`${winner.name} hits ${loser.name} for **${damageTaken}** damage (Base: ${baseDamage}, Bonus: ${bonusDamage}).`);
}


function endTurnChecks() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    
    // Display the combat log
    document.getElementById('dialogue-text').innerHTML = currentTurn.log.join('<br>');
    
    // Check if player or enemy died
    if (!player.isAlive) {
        gameState.state = 'GAME_OVER';
        clearActions();
        document.getElementById('action-area').innerHTML = `<p>Game Over. You perished on Floor ${gameState.currentFloor}!</p><button onclick="startGame()">Try Again?</button>`;
    } else if (!enemy.isAlive) {
        // Player wins!
        gameState.currentGold += 10; // Reward
        displayDialogue(currentTurn.log.join('<br>') + `<br><br>**VICTORY!** The ${enemy.name} is defeated! You gained 10 Gold.`);
        clearActions();
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="nextRunStage()">Continue Deeper</button>`;
    } else {
        // Combat continues
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="displayCombatOptions()">End Turn & Continue</button>`;
        // Note: The player must click the button to see the options for the *next* turn.
    }
    
    updateStatsDisplay();
}

// Ensure the game starts when the page loads
// We call this function when the user clicks 'Start New Run' in index.html, 
// so we don't need a call here.
// document.addEventListener('DOMContentLoaded', () => {
//     // Initial setup or display menu
// });
