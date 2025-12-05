// --- 1. Character Data Definitions (Initial Rosters) ---

const CHARACTER_DATA = {
    // Player Characters
    BALTER: {
        name: "Balter",
        maxHp: 120, attack: 10, defense: 6, speed: 7, coinFlips: 2,
    },
    STRIKER: {
        name: "Striker",
        maxHp: 90, attack: 6, defense: 4, speed: 12, coinFlips: 1,
    },
    SHUTENMARU: {
        name: "Shuten-Maru",
        maxHp: 80, attack: 8, defense: 5, speed: 15, coinFlips: 1
    },
    ZECT: {
        name: "Zect",
        maxHp: 100, attack: 6, defense: 5, speed: 9, coinFlips: 2
    },

    // Enemy Example
    GOBLIN: {
        name: "Goblin Grunt", maxHp: 30, attack: 8, defense: 2, speed: 6, coinFlips: 1
    }
};

// --- 2. Data Structures ---

/**
 * A class for any entity in the game (Player or Enemy).
 * Tracks core stats and temporary status effects.
 */
class Character {
    constructor(data) {
        this.name = data.name;
        this.maxHp = data.maxHp;
        this.currentHp = data.maxHp;
        
        this.baseDefense = data.defense; 
        this.defense = data.defense;     
        this.baseAttack = data.attack; 
        this.attack = data.attack;

        this.baseSpeed = data.speed;
        this.speed = data.speed;

        this.baseCoinFlips = data.coinFlips;
        this.coinFlips = data.coinFlips;
        this.isAlive = true;
        
        // Status and Buff Tracking
        this.status = {
            isGrappled: false,
            isGrappledBy: null, // Reference to the grappler
            isStaggered: false, // Cannot move next turn (Striker's Heavy Blow)
            skipperTurns: 0,    // Striker's buff duration
            mistyStacks: 0,     // Shuten-Maru's defense stacks
            momentumStacks: 0,  // Striker's damage stacks
            currentForm: data.name === 'Zect' ? 'Scythe' : null, // Zect's weapon form
            rewindUsed: false,  // Shuten-Maru's unique
            ironGuardActive: false, // Balter's counter state
            tempDefenseBonus: 0, // Used for DEFEND action
            tempSpeedBonus: 0, // Used for Phase/Accelerator/Rewind
            zectClashBonus: 0, // Zect's Trident switch bonus
        };
    }

    // --- Core Methods ---
    
    takeDamage(damage, type = 'Physical', ignoreDefense = false) {
        // Shuten-Maru's Misty Trait Check
        if (this.name === 'Shuten-Maru' && this.status.mistyStacks > 0) {
            // Misty is consumed on attack
            currentTurn.log.push(`*Shuten-Maru's Misty stack (${this.status.mistyStacks}) dissipated, lessening the impact.*`);
            // Reduce damage as a proxy for the reduced die size
            damage = Math.max(1, damage - (this.status.mistyStacks * 2)); 
            this.status.mistyStacks = 0;
        }

        let defenseValue = ignoreDefense ? 0 : this.defense;
        let effectiveDamage = Math.max(0, damage - defenseValue);
        this.currentHp -= effectiveDamage;

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isAlive = false;
        }

        // Zect's Scythe Form Switch Bonus (Heal on hit)
        if (this.name === 'Zect' && this.status.currentForm === 'Scythe' && currentTurn.actionPerformer === this && effectiveDamage > 0) {
             // Zect heals for damage dealt on next attack (We need to track this better)
             // For now, let's just assume the heal happens when the attack is resolved, not here.
        }

        return effectiveDamage;
    }

    rollAttackDamage(dieSize, type = 'Physical') {
        let baseDamage = 1 + Math.floor(Math.random() * dieSize);
        let bonus = 0;
        
        // Striker Momentum Trait
        if (this.name === 'Striker' && type === 'Physical' && this.status.momentumStacks > 0) {
            bonus += this.status.momentumStacks;
        }
        
        // Striker Skipper Buff
        if (this.name === 'Striker' && this.status.skipperTurns > 0) {
             bonus += 2;
        }

        // Shuten-Maru Rewind Damage Double
        if (this.name === 'Shuten-Maru' && currentTurn.isRewindTurn) {
            baseDamage *= 2;
            currentTurn.log.push(`Shuten-Maru's damage doubled due to Rewind!`);
        }

        return baseDamage + bonus;
    }

    // --- Ability Helpers (Used in resolveTurn) ---

    // This is the core logic for the simple DEFEND action
    startDefend() {
        this.status.tempDefenseBonus = 5;
        this.defense += 5; 
        this.status.ironGuardActive = (this.name === 'Balter'); // Balter activates Iron Guard
        currentTurn.log.push(`${this.name} braces for impact, gaining +5 Defense this turn.`);
    }

    endTurnCleanup() {
        // Reset temporary effects (Defense from DEFEND, Speed from Phase)
        this.defense = this.baseDefense; // Quick reset: BaseDefense + Zect's permanent Hammer bonus (if any)
        
        this.status.tempDefenseBonus = 0;
        this.speed = this.baseSpeed;
        this.status.tempSpeedBonus = 0;
        
        this.status.ironGuardActive = false;
        this.status.isStaggered = false; // Clear stagger
        this.status.zectClashBonus = 0; // Zect Trident bonus used up
        
        // Striker's Skipper Countdown
        if (this.name === 'Striker' && this.status.skipperTurns > 0) {
            this.status.skipperTurns--;
            // Handle defense change when Skipper is active
            if (this.status.skipperTurns === 0) {
                this.defense = this.baseDefense; // Restore defense
                this.coinFlips = this.baseCoinFlips; // Reset coin buff
                currentTurn.log.push(`Striker's Skipper buff ends. Defense restored.`);
            }
        }
    }
}

// Global Game State Object
const gameState = {
    player: null,
    currentFloor: 1,
    currentGold: 0,
    currentEnemy: null,
    state: 'MENU', // States: 'MENU', 'VN_EVENT', 'COMBAT', 'GAME_OVER'
    playerCharacterKey: null // Stores which character the player chose (e.g., 'BALTER')
};

// Global State for the current combat turn
let currentTurn = {
    playerAction: null, 
    enemyAction: null,
    actionPerformer: null, // Used to track who is currently executing an attack
    log: [],
    isRewindTurn: false, // For Shuten-Maru's Rewind
    staggeredEntity: null // Tracks who is staggered for the next turn
};


// --- General Utility Functions ---

// UI/Display functions (Remain the same)
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

function showView(viewId) {
    // Hide all view containers
    document.querySelectorAll('.game-view').forEach(view => {
        view.classList.add('hidden');
    });
    // Show the requested view container
    document.getElementById(viewId).classList.remove('hidden');
}


// --- Game Loop and Flow Functions ---

function startGame(chosenCharacterKey) {
    // 1. Initialize Player from data
    gameState.playerCharacterKey = chosenCharacterKey;
    gameState.player = new Character(CHARACTER_DATA[chosenCharacterKey]);
    gameState.currentFloor = 1;
    gameState.currentGold = 0;
    gameState.state = 'VN_EVENT'; 

    updateStatsDisplay();
    displayDialogue(`A new journey begins... You chose **${gameState.player.name}**!`);
    
    // 2. Clear old buttons and start the run
    clearActions();
    showView('vn-view'); // Show VN view
    nextRunStage();
}

function nextRunStage() {
    if (gameState.state === 'COMBAT') {
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

// --- Visual Novel/Event Functions (Simplified) ---

function startVNEvent() {
    gameState.state = 'VN_EVENT';
    showView('vn-view');
    // ... (logic to display event and choices)
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
    showView('vn-view');
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
    showView('combat-view');
    
    // Enemy Initialization (using Goblin for now)
    gameState.currentEnemy = new Character(CHARACTER_DATA.GOBLIN);
    
    displayCombatOptions();
}

function displayCombatOptions() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    
    // 1. Clean up from last turn and reset stats
    player.endTurnCleanup(); 
    enemy.endTurnCleanup();
    currentTurn.isRewindTurn = false; // Reset rewind flag

    // Check for stagger (from Striker's Heavy Blow)
    if (player.status.isStaggered) {
        currentTurn.log.push(`${player.name} is Staggered and cannot move this turn.`);
        // Immediately run enemy turn
        handlePlayerAction('STAGGERED'); 
        return;
    }

    // 2. Update UI
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-stats').textContent = `HP: ${enemy.currentHp}/${enemy.maxHp} | Speed: ${enemy.speed}`;
    document.getElementById('combat-log').innerHTML = currentTurn.log.join('<br>');
    updateStatsDisplay();
    
    // 3. Display Player Abilities
    let abilitiesHTML = getPlayerAbilities(player.name);
    
    displayDialogue(`Your Move: **${enemy.name}** (HP: ${enemy.currentHp}) vs. **${player.name}** (HP: ${player.currentHp})`);
    document.getElementById('action-area').innerHTML = abilitiesHTML;
}

function getPlayerAbilities(characterName) {
    // This function generates the HTML buttons based on the player character
    let html = '';
    
    // Always include a basic DEFEND/GUARD option
    html += `<button class="action-button" onclick="handlePlayerAction('DEFEND')">Guard (Block)</button>`;

    if (characterName === 'Balter') {
        html += `<button class="action-button" onclick="handlePlayerAction('HAYMAKER')">Haymaker (1d10)</button>`;
        html += `<button class="action-button" onclick="handlePlayerAction('GRAPPLE')">Grapple (Utility)</button>`;
        // Piledriver is only available if the enemy is grappled
        if (gameState.currentEnemy.status.isGrappled) {
            html += `<button class="action-button" onclick="handlePlayerAction('PILEDRIVER')">Piledriver (20 Dmg)</button>`;
        }
        html += `<button class="action-button" onclick="handlePlayerAction('IRONGUARD')">Iron Guard (Counter)</button>`;
    } 
    // ... add logic for Striker, Shuten-Maru, and Zect here ...

    return html;
}

function handlePlayerAction(action) {
    currentTurn.playerAction = action;
    
    // Check for Piledriver requirement failure
    if (action === 'PILEDRIVER' && !gameState.currentEnemy.status.isGrappled) {
        currentTurn.log.push("Piledriver failed: Target must be Grappled!");
        displayCombatOptions(); // Redraw options
        return;
    }

    // 1. Enemy chooses its action (Simple AI: 70% Attack, 30% Defend)
    currentTurn.enemyAction = (Math.random() < 0.7) ? 'ATTACK' : 'DEFEND';
    
    // 2. Resolve the turn
    resolveTurn();
}

// --- CORE RESOLUTION LOGIC ---

function resolveTurn() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    currentTurn.log = []; // Reset turn log

    // 3. Check for CLASH (Both choose ATTACK)
    if (currentTurn.playerAction === 'HAYMAKER' && currentTurn.enemyAction === 'ATTACK') {
        runClash(player, enemy);
    } 
    // 4. Resolve Standard Actions (Speed Dependent)
    else {
        // Determine who is faster (if speeds are equal, player goes first)
        const playerIsFaster = player.speed >= enemy.speed;
        
        const resolutionOrder = playerIsFaster ? 
            [{ entity: player, action: currentTurn.playerAction, target: enemy }] :
            [{ entity: enemy, action: currentTurn.enemyAction, target: player }];
        
        // Add the slower entity to the order
        resolutionOrder.push(playerIsFaster ? 
            { entity: enemy, action: currentTurn.enemyAction, target: player } :
            { entity: player, action: currentTurn.playerAction, target: enemy }
        );

        // Run the actions in speed order
        for (const { entity, action, target } of resolutionOrder) {
            if (!entity.isAlive || !target.isAlive || action === 'STAGGERED') continue; 
            currentTurn.actionPerformer = entity; // Set who is performing the action

            // Placeholder for ability handling (THIS IS WHERE WE WILL ADD COMPLEX LOGIC)
            if (action === 'HAYMAKER') {
                handleAttackAction(entity, target, 10, 'Physical'); // 1d10
            } else if (action === 'DEFEND' || action === 'IRONGUARD') {
                entity.startDefend();
            } else if (action === 'GRAPPLE') {
                handleGrapple(entity, target); // Balter's special move
            } else if (action === 'PILEDRIVER') {
                handlePiledriver(entity, target);
            }
            // Enemy simple action
            else if (action === 'ATTACK') {
                handleAttackAction(entity, target, enemy.attack, 'Physical');
            }
        }

        // --- Balter's Iron Guard Counter Trait Check ---
        // This check must happen AFTER all main actions resolve
        // If Balter successfully defended (i.e., opponent attacked and Balter was faster or slower but defended)
        // This logic is complex and needs the specific rules. For now, let's simplify the check:
        if (player.name === 'Balter' && player.status.ironGuardActive && currentTurn.enemyAction === 'ATTACK') {
            // If Balter's DEFEND/IRONGUARD was faster than the enemy's attack, 
            // the attack was likely blocked or reduced. Execute the counter.
            currentTurn.log.push(`Balter's Iron Guard triggers a free Haymaker counter!`);
            // Execute the free attack (no clash possible here)
            handleAttackAction(player, enemy, 10, 'Physical', true); // True = free attack
        }
    }

    // 5. Check for End of Combat
    endTurnChecks();
}


function handleAttackAction(attacker, defender, dieSize, type, isFreeAttack = false) {
    // Determine the action the defender chose for this turn
    const defenderAction = (defender === gameState.player) ? currentTurn.playerAction : currentTurn.enemyAction;

    // --- IMPLEMENTING SPEED-BLOCK LOGIC ---
    const defenderIsFaster = defender.speed > attacker.speed;
    
    // If defender is Defending AND is FASTER than the attacker, they Block/Avoid
    if (defenderAction === 'DEFEND' && defenderIsFaster && !isFreeAttack) {
        currentTurn.log.push(`*${defender.name} is faster and successfully defended!* The attack misses.`);
        // If Iron Guard was active, we need to know the block happened for the counter
        if (defender.name === 'Balter' && defender.status.ironGuardActive) {
            // This is the successful block Balter needs, but the counter happens later
        }
        return; // Attack is completely avoided
    }
    
    // If Grappled, all CLASHES fail, but we're in a standard attack here.
    if (defender.status.isGrappled) {
        currentTurn.log.push(`*${defender.name} is Grappled, reducing their maneuverability.*`);
    }

    let baseDamage = attacker.rollAttackDamage(dieSize, type);
    let damageTaken = defender.takeDamage(baseDamage, type);
    
    currentTurn.log.push(`${attacker.name} attacks ${defender.name} (${type}) for **${damageTaken}** damage!`);
    
    // Striker Momentum Trait Cleanup
    if (attacker.name === 'Striker' && type === 'Physical') {
        attacker.status.momentumStacks = 0; // Clear stacks after hit
    }

    // Shuten-Maru Chrono-Fist Trait Check
    if (attacker.name === 'Shuten-Maru' && type === 'Psychic' && baseDamage === dieSize) {
        // Max damage rolled (1d8 = 8, 1d6 = 6, etc.)
        // This is complex, requires tracking damage taken last turn. Let's simplify:
        // Heal for a small amount as a proxy for "undoing damage"
        const heal = 5; 
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + heal);
        currentTurn.log.push(`Shuten-Maru's Chrono-Fist triggers! He heals for ${heal}.`);
    }
}

function handleGrapple(grappler, target) {
    // Balter rolls 1d10, target rolls their Strength stat (d8 average).
    // Let's simplify the target roll to 1d8.
    const grapplerRoll = 1 + Math.floor(Math.random() * 10);
    const targetRoll = 1 + Math.floor(Math.random() * 8); // Proxy for Str stat (d8 avg)

    if (grapplerRoll > targetRoll) {
        target.status.isGrappled = true;
        target.status.isGrappledBy = grappler;
        // Target Speed stat is reduced by 5
        target.speed = Math.max(1, target.baseSpeed - 5);
        currentTurn.log.push(`**Grapple SUCCESS!** ${target.name}'s speed is reduced and all Clashes will fail.`);
    } else {
        currentTurn.log.push(`Grapple failed. ${target.name} resisted the attempt!`);
    }
}

function handlePiledriver(attacker, target) {
    if (!target.status.isGrappled) {
        // This should be blocked by getPlayerAbilities, but is a safety check
        currentTurn.log.push("Piledriver requires Grapple and failed!");
        return;
    }

    // Deals 20 Physical damage
    let damageTaken = target.takeDamage(20, 'Physical', true); // Fixed 20 damage, ignoring defense for simplicity
    
    // Ends the grapple
    target.status.isGrappled = false;
    target.status.isGrappledBy = null;
    target.speed = target.baseSpeed; // Restore speed

    currentTurn.log.push(`**PILEDRIVER!** ${target.name} takes ${damageTaken} damage! Grapple ends.`);
}

function flipCoins(numCoins, entity) {
    let heads = 0;
    
    // Striker's Skipper Trait
    if (entity.name === 'Striker' && entity.status.skipperTurns > 0) {
        heads = numCoins; // All coins are automatically heads
        currentTurn.log.push(`Striker's Skipper: All flips are Heads!`);
    } else {
        for (let i = 0; i < numCoins; i++) {
            if (Math.random() >= 0.5) { 
                heads++;
            }
        }
    }
    return heads;
}

function runClash(p1, p2) {
    // --- Grapple Fail Check ---
    if (p1.status.isGrappled || p2.status.isGrappled) {
        const grappledEntity = p1.status.isGrappled ? p1 : p2;
        currentTurn.log.push(`The Clash is nullified! **${grappledEntity.name}** automatically fails the Clash due to Grapple.`);
        // The entity that is NOT grappled gets a free attack.
        const winner = grappledEntity === p1 ? p2 : p1;
        const loser = grappledEntity;
        
        currentTurn.log.push(`${winner.name} gets a free attack.`);
        handleAttackAction(winner, loser, winner.attack, 'Physical', true); // True = free attack
        return;
    }
    
    // --- Coin Flip Logic ---
    let p1Coins = p1.coinFlips;
    let p2Coins = p2.coinFlips;
    
    // Zect's Homogenous Trait (Simplified: Assume opponent is 'woman' for now)
    const isZect = p1.name === 'Zect' || p2.name === 'Zect';
    const zect = p1.name === 'Zect' ? p1 : p2;
    if (isZect) {
        // Doubled coins
        if (zect === p1) p1Coins *= 2;
        else p2Coins *= 2;
    }
    
    let p1Heads = flipCoins(p1Coins, p1);
    let p2Heads = flipCoins(p2Coins, p2);
    
    currentTurn.log.push(`***CLASH!*** Both attack!`);
    currentTurn.log.push(`${p1.name} flips ${p1Coins} coins and gets **${p1Heads}** Heads.`);
    currentTurn.log.push(`${p2.name} flips ${p2Coins} coins and gets **${p2Heads}** Heads.`);

    let winner, loser, winnerHeads;
    
    if (p1Heads > p2Heads) {
        winner = p1; loser = p2; winnerHeads = p1Heads;
    } else if (p2Heads > p1Heads) {
        winner = p2; loser = p1; winnerHeads = p2Heads;
    } else {
        // Draw: Both take a small hit
        let p1Taken = p1.takeDamage(p2.rollAttackDamage(p2.attack));
        let p2Taken = p2.takeDamage(p1.rollAttackDamage(p1.attack));
        currentTurn.log.push(`The clash is a DRAW! Both take damage.`);
        currentTurn.log.push(`${p1.name} takes ${p1Taken} damage. ${p2.name} takes ${p2Taken} damage.`);
        return;
    }

    // Winner gets the attack, plus bonus damage for heads
    let bonusDamage = winnerHeads * 2;
    
    // Zect's Homogenous Trait Bonus (Double Clash damage if Zect wins)
    if (winner.name === 'Zect') {
        bonusDamage *= 2;
        currentTurn.log.push(`Zect's Homogenous Trait doubles the clash bonus damage!`);
    }
    
    // Zect's Trident Switch Bonus
    bonusDamage += winner.status.zectClashBonus;

    let baseDamage = winner.rollAttackDamage(winner.attack);
    let totalDamage = baseDamage + bonusDamage;
    
    let damageTaken = loser.takeDamage(totalDamage);
    
    currentTurn.log.push(`**${winner.name} WINS** the clash!`);
    currentTurn.log.push(`${winner.name} hits ${loser.name} for **${damageTaken}** damage (Base: ${baseDamage}, Bonus: ${bonusDamage}).`);

    // --- Winner Traits ---
    
    // Balter's Old One-Two Trait
    if (winner.name === 'Balter') {
        const extraDie = loser.status.isGrappled ? 6 : 4;
        const extraDmg = 1 + Math.floor(Math.random() * extraDie);
        const dmgTaken = loser.takeDamage(extraDmg, 'Physical', true); // Ignores defense
        currentTurn.log.push(`Balter's Old One-Two! Extra hit for ${dmgTaken} damage!`);
    }
    
    // Striker's Slow Start Trait (Momentum)
    if (winner.name === 'Striker') {
        if (winner.status.momentumStacks < 3) winner.status.momentumStacks++;
        currentTurn.log.push(`Striker gains a stack of Momentum (${winner.status.momentumStacks}).`);
    }
}


function endTurnChecks() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    
    // Display the combat log
    document.getElementById('combat-log').innerHTML = currentTurn.log.join('<br>');
    
    // Check if player or enemy died
    if (!player.isAlive) {
        gameState.state = 'GAME_OVER';
        clearActions();
        document.getElementById('action-area').innerHTML = `<p>Game Over. You perished on Floor ${gameState.currentFloor}!</p><button onclick="startGame('${gameState.playerCharacterKey}')">Try Again?</button>`;
        showView('vn-view'); // Switch back to VN/Game Over screen
    } else if (!enemy.isAlive) {
        // Player wins!
        gameState.currentGold += 10; // Reward
        displayDialogue(currentTurn.log.join('<br>') + `<br><br>**VICTORY!** The ${enemy.name} is defeated! You gained 10 Gold.`);
        clearActions();
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="nextRunStage()">Continue Deeper</button>`;
        showView('vn-view'); // Switch back to VN/Event screen
    } else {
        // Combat continues
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="displayCombatOptions()">End Turn & Continue</button>`;
        // Note: The player must click the button to see the options for the *next* turn.
    }
    
    updateStatsDisplay();
}

// Initial Call (No function call here, waiting for the HTML button to call startGame)
