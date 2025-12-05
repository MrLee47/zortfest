// Global State for the current combat turn
let currentTurn = {
    playerAction: null, // 'ATTACK', 'DEFEND', or 'ABILITY_X'
    enemyAction: null,
    playerDamageRoll: 0,
    enemyDamageRoll: 0,
    log: []
};

// --- Combat Functions ---

function startCombat() {
    gameState.state = 'COMBAT';
    
    // Define a new enemy with speed
    gameState.currentEnemy = new Character("Goblin Grunt", 30, 8, 2, 6); // HP 30, ATK 8, DEF 2, SPEED 6
    
    // Give the player speed as well (let's say 10 for a head start)
    gameState.player.speed = 10; 
    
    displayCombatOptions();
}

function displayCombatOptions() {
    const enemy = gameState.currentEnemy;
    
    // Clear previous log/results
    currentTurn.log = [];
    
    displayDialogue(`Combat: **${enemy.name}** (HP: ${enemy.currentHp}) vs. **${gameState.player.name}** (HP: ${gameState.player.currentHp})`);
    
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `
        <button class="action-button" onclick="handlePlayerAction('ATTACK')">Attack (Base ${gameState.player.attack})</button>
        <button class="action-button" onclick="handlePlayerAction('DEFEND')">Defend (+5 Def)</button>
    `;
    updateStatsDisplay();
}

function handlePlayerAction(action) {
    currentTurn.playerAction = action;
    
    // 1. Enemy chooses its action (Simple AI for now: 70% Attack, 30% Defend)
    currentTurn.enemyAction = (Math.random() < 0.7) ? 'ATTACK' : 'DEFEND';
    
    // 2. Resolve the turn
    resolveTurn();
}

function resolveTurn() {
    const player = gameState.player;
    const enemy = gameState.currentEnemy;
    currentTurn.log = []; // Reset turn log

    // 3. Determine Move Order
    const fasterEntity = (player.speed > enemy.speed) ? 'player' : 'enemy';
    const slowerEntity = (player.speed <= enemy.speed) ? 'player' : 'enemy';
    
    // A. Check for CLASH (Both choose ATTACK)
    if (currentTurn.playerAction === 'ATTACK' && currentTurn.enemyAction === 'ATTACK') {
        runClash(player, enemy);
    } 
    // B. Resolve Standard Actions (Speed Dependent)
    else {
        // Order: Faster entity resolves its move, then the slower one
        const resolutionOrder = [
            { entity: fasterEntity === 'player' ? player : enemy, action: fasterEntity === 'player' ? currentTurn.playerAction : currentTurn.enemyAction, target: fasterEntity === 'player' ? enemy : player },
            { entity: slowerEntity === 'player' ? player : enemy, action: slowerEntity === 'player' ? currentTurn.playerAction : currentTurn.enemyAction, target: slowerEntity === 'player' ? enemy : player }
        ];

        for (const { entity, action, target } of resolutionOrder) {
            if (!entity.isAlive || !target.isAlive) continue; // Stop if someone died

            if (action === 'ATTACK') {
                handleAttack(entity, target);
            } else if (action === 'DEFEND') {
                handleDefend(entity);
            }
        }
        
        // Remove temporary defense bonus at the end of the turn
        if (currentTurn.playerAction !== 'DEFEND') player.defense -= 5;
        if (currentTurn.enemyAction !== 'DEFEND') enemy.defense -= 5;
        
    }

    // 4. Update and Check for End of Combat
    endTurnChecks();
}

function handleAttack(attacker, defender) {
    // If the defender is in DEFEND state, the attack may miss if the attacker is slower
    // YOUR RULE: The defensive move must be faster than the attack to block it.
    
    let baseDamage = attacker.rollAttackDamage();
    let effectiveDamage = defender.takeDamage(baseDamage);
    
    currentTurn.log.push(`${attacker.name} attacks ${defender.name} for ${effectiveDamage} damage!`);
}

function handleDefend(defender) {
    // Apply temporary defense buff
    defender.defense += 5; 
    currentTurn.log.push(`${defender.name} braces for impact, gaining +5 Defense this turn.`);
}


function flipCoins(numCoins) {
    let heads = 0;
    for (let i = 0; i < numCoins; i++) {
        if (Math.random() >= 0.5) { // 50% chance for heads
            heads++;
        }
    }
    return heads;
}

function runClash(p1, p2) {
    let p1Heads = flipCoins(p1.coinFlips);
    let p2Heads = flipCoins(p2.coinFlips);
    
    currentTurn.log.push(`CLASH! Both combatants attack!`);
    currentTurn.log.push(`${p1.name} flips ${p1.coinFlips} coins and gets ${p1Heads} Heads.`);
    currentTurn.log.push(`${p2.name} flips ${p2.coinFlips} coins and gets ${p2Heads} Heads.`);

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
        let p1Damage = p1.rollAttackDamage();
        let p2Damage = p2.rollAttackDamage();
        
        let p1Taken = p1.takeDamage(p2Damage);
        let p2Taken = p2.takeDamage(p1Damage);
        
        currentTurn.log.push(`The clash is a DRAW! Both take damage.`);
        currentTurn.log.push(`${p1.name} takes ${p1Taken} damage. ${p2.name} takes ${p2Taken} damage.`);
        endTurnChecks();
        return;
    }

    // Winner gets the attack, plus bonus damage for heads
    let bonusDamage = winnerHeads * 2;
    let baseDamage = winner.rollAttackDamage();
    let totalDamage = baseDamage + bonusDamage;
    
    let damageTaken = loser.takeDamage(totalDamage);
    
    currentTurn.log.push(`${winner.name} WINS the clash! (${winnerHeads} Heads)`);
    currentTurn.log.push(`${winner.name} hits ${loser.name} for ${damageTaken} damage (Base: ${baseDamage}, Bonus: ${bonusDamage}).`);

    endTurnChecks();
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
        document.getElementById('action-area').innerHTML = `<p>Game Over. You perished!</p><button onclick="startGame()">Try Again?</button>`;
    } else if (!enemy.isAlive) {
        // Player wins!
        gameState.currentGold += 10; // Reward
        displayDialogue(currentTurn.log.join('<br>') + `<br><br>The ${enemy.name} is defeated! You gained 10 Gold.`);
        clearActions();
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="nextRunStage()">Continue Deeper</button>`;
    } else {
        // Combat continues
        document.getElementById('action-area').innerHTML = `<button class="action-button" onclick="displayCombatOptions()">Next Turn</button>`;
        displayCombatOptions(); // Re-display action buttons for the player
    }
    
    updateStatsDisplay();
}
